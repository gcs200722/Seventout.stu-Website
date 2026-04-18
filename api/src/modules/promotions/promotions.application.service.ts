import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { CART_CACHE_PORT } from '../cart/cart-cache.port';
import type { CartCachePort } from '../cart/cart-cache.port';
import { CartItemEntity } from '../cart/entities/cart-item.entity';
import { CartEntity, CartStatus } from '../cart/entities/cart.entity';
import { ProductEntity } from '../products/product.entity';
import type { CheckoutCartSnapshot } from '../orders/ports/order-cart.port';
import type { PricedCheckoutSnapshot } from '../orders/ports/order-pricing.port';
import { CouponEntity } from './entities/coupon.entity';
import { PromotionCampaignEntity } from './entities/promotion-campaign.entity';
import { PromotionRuleEntity } from './entities/promotion-rule.entity';
import {
  allocateProportionalDiscount,
  buildPricingSnapshot,
  computeBestAutoDiscount,
  computeCatalogProductPreview,
  computeCouponDiscount,
  mergeStackBestOf,
  type PricingDiscountLineItem,
} from './promotion-engine.domain';
import { PromotionsRepository } from './promotions.repository';
import { PROMOTIONS_ACTIVE_CACHE_PORT } from './promotions-active-cache.port';
import type { PromotionsActiveCachePort } from './promotions-active-cache.port';
import type { PricingLineInput } from './promotions.types';

@Injectable()
export class PromotionsApplicationService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly promotionsRepository: PromotionsRepository,
    @InjectRepository(CartEntity)
    private readonly cartsRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemsRepository: Repository<CartItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(CouponEntity)
    private readonly couponsRepository: Repository<CouponEntity>,
    @InjectRepository(PromotionCampaignEntity)
    private readonly campaignsWriteRepository: Repository<PromotionCampaignEntity>,
    @InjectRepository(PromotionRuleEntity)
    private readonly rulesWriteRepository: Repository<PromotionRuleEntity>,
    @Inject(CART_CACHE_PORT) private readonly cartCache: CartCachePort,
    @Inject(PROMOTIONS_ACTIVE_CACHE_PORT)
    private readonly activePromotionsCache: PromotionsActiveCachePort,
    configService: ConfigService,
  ) {
    this.cacheTtlSeconds = configService.get<number>(
      'PROMOTION_CACHE_TTL_SECONDS',
      120,
    );
  }

  private normalizeCouponCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async invalidateActivePromotionsCache(): Promise<void> {
    await this.activePromotionsCache.invalidate();
  }

  async attachCouponToCart(userId: string, code: string): Promise<unknown> {
    const normalized = this.normalizeCouponCode(code);
    if (!normalized.length) {
      throw new BadRequestException({
        message: 'Coupon code is required',
        details: { code: 'COUPON_INVALID' },
      });
    }
    const coupon =
      await this.promotionsRepository.findCouponByNormalizedCode(normalized);
    const cart = await this.requireActiveCart(userId);
    const subtotal = await this.sumCartSubtotal(cart.id);
    if (subtotal <= 0) {
      throw new BadRequestException({
        message: 'Cart is empty',
        details: { code: 'CART_EMPTY' },
      });
    }
    this.assertCouponBasics(coupon, new Date());
    this.assertCouponCartMinimum(coupon!, subtotal);
    await this.assertUserCouponUsage(coupon!.id, userId, undefined);

    cart.appliedCouponId = coupon!.id;
    await this.cartsRepository.save(cart);
    await this.cartCache.invalidate(userId);

    const snapshot = await this.buildCheckoutSnapshotForCart(cart.id, userId);
    const priced = await this.priceCheckoutSnapshot(
      userId,
      cart.id,
      snapshot,
      undefined,
    );
    return {
      valid: true,
      discount: priced.discount_total,
      final_total: priced.total_amount,
      subtotal_amount: priced.subtotal_amount,
      pricing_snapshot: priced.pricing_snapshot,
    };
  }

  async removeCouponFromCart(userId: string): Promise<void> {
    const cart = await this.requireActiveCart(userId);
    cart.appliedCouponId = null;
    await this.cartsRepository.save(cart);
    await this.cartCache.invalidate(userId);
  }

  async getQuoteForActiveCart(userId: string): Promise<unknown> {
    const cart = await this.requireActiveCart(userId);
    const subtotal = await this.sumCartSubtotal(cart.id);
    if (subtotal <= 0) {
      return {
        subtotal_amount: 0,
        discount: 0,
        final_total: 0,
        pricing_snapshot: {
          subtotal_amount: 0,
          discount_total: 0,
          total_amount: 0,
          stack_mode: 'BEST_OF',
        },
      };
    }
    const snapshot = await this.buildCheckoutSnapshotForCart(cart.id, userId);
    const priced = await this.priceCheckoutSnapshot(
      userId,
      cart.id,
      snapshot,
      undefined,
    );
    return {
      discount: priced.discount_total,
      final_total: priced.total_amount,
      subtotal_amount: priced.subtotal_amount,
      pricing_snapshot: priced.pricing_snapshot,
    };
  }

  async getActivePromotionsPublic(now = new Date()): Promise<unknown> {
    const cached = await this.activePromotionsCache.getSerialized();
    if (cached) {
      try {
        return JSON.parse(cached) as unknown;
      } catch {
        await this.activePromotionsCache.invalidate();
      }
    }
    const rows =
      await this.promotionsRepository.findActiveAutoCampaignsWithRules();
    const filtered = this.filterCampaignsInWindow(rows, now).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      discount_type: c.discountType,
      value: c.value,
      max_discount: c.maxDiscount,
      priority: c.priority,
      start_date: c.startDate.toISOString(),
      end_date: c.endDate?.toISOString() ?? null,
      is_active: c.isActive,
    }));
    const payload = { campaigns: filtered, fetched_at: now.toISOString() };
    await this.activePromotionsCache.setSerialized(
      JSON.stringify(payload),
      this.cacheTtlSeconds,
    );
    return payload;
  }

  /**
   * Best AUTO promotion per SKU for PLP / product cards.
   * Simulates qty=1 plus rule-driven minimums (e.g. min_quantity, min_order_value)
   * so thresholds like “mua từ 2” still surface campaign name and before/after unit pricing.
   */
  async previewCatalogPromotionsForProducts(
    items: Array<{ productId: string; categoryId: string; unitPrice: number }>,
  ): Promise<
    Record<
      string,
      {
        campaign_name: string;
        list_price: number;
        sale_price: number;
        discount_amount: number;
        conditions_display?: {
          min_quantity: number | null;
          min_order_value: number | null;
          scoped_to_products: boolean;
          scoped_to_categories: boolean;
        };
      }
    >
  > {
    const now = new Date();
    const rows =
      await this.promotionsRepository.findActiveAutoCampaignsWithRules();
    const campaigns = this.filterCampaignsInWindow(rows, now).map((c) => ({
      ...c,
      rules: (c.rules ?? []).filter((r) => !r.deletedAt),
    }));

    const result: Record<
      string,
      {
        campaign_name: string;
        list_price: number;
        sale_price: number;
        discount_amount: number;
        conditions_display?: {
          min_quantity: number | null;
          min_order_value: number | null;
          scoped_to_products: boolean;
          scoped_to_categories: boolean;
        };
      }
    > = {};

    for (const item of items) {
      const preview = computeCatalogProductPreview(
        campaigns,
        item.productId,
        item.categoryId,
        item.unitPrice,
      );
      const discountAmount = preview?.discount_amount ?? 0;
      if (!preview || discountAmount <= 0 || !preview.campaign_name) {
        result[item.productId] = {
          campaign_name: '',
          list_price: item.unitPrice,
          sale_price: item.unitPrice,
          discount_amount: 0,
        };
        continue;
      }
      result[item.productId] = {
        campaign_name: preview.campaign_name,
        list_price: preview.list_price,
        sale_price: preview.sale_price,
        discount_amount: discountAmount,
        ...(preview.conditions_display
          ? { conditions_display: preview.conditions_display }
          : {}),
      };
    }
    return result;
  }

  async priceCheckoutSnapshot(
    userId: string,
    _cartId: string,
    snapshot: CheckoutCartSnapshot,
    manager?: EntityManager,
  ): Promise<PricedCheckoutSnapshot> {
    const now = new Date();
    const subtotal = snapshot.subtotal_amount;
    const lines = await this.buildPricingLines(snapshot.items, manager);

    let appliedCoupon: CouponEntity | null = null;
    if (snapshot.applied_coupon_id) {
      const repo = manager
        ? manager.getRepository(CouponEntity)
        : this.couponsRepository;
      appliedCoupon = await repo.findOne({
        where: { id: snapshot.applied_coupon_id, deletedAt: IsNull() },
      });
      if (!appliedCoupon) {
        throw new BadRequestException({
          message: 'Coupon is expired or invalid',
          details: { code: 'COUPON_INVALID' },
        });
      }
      this.assertCouponBasics(appliedCoupon, now);
      this.assertCouponCartMinimum(appliedCoupon, subtotal);
      await this.assertUserCouponUsage(appliedCoupon.id, userId, manager);
    }

    const campaigns = this.filterCampaignsInWindow(
      await this.promotionsRepository.findActiveAutoCampaignsWithRules(),
      now,
    ).map((c) => ({
      ...c,
      rules: (c.rules ?? []).filter((r) => !r.deletedAt),
    }));

    const couponQuote = appliedCoupon
      ? computeCouponDiscount(
          appliedCoupon.type,
          appliedCoupon.value,
          subtotal,
          appliedCoupon.minOrderValue,
          appliedCoupon.maxDiscount,
        )
      : { amount: 0, free_shipping: false };

    const auto = computeBestAutoDiscount(campaigns, lines, subtotal);
    const merged = mergeStackBestOf(subtotal, couponQuote, auto);

    const couponWon =
      merged.coupon_discount > 0 ||
      (merged.coupon_free_shipping && appliedCoupon !== null);
    const recordCouponUsage = Boolean(
      appliedCoupon && couponWon && merged.discount_total >= 0,
    );

    let discount_line_items: PricingDiscountLineItem[] | undefined;
    if (
      !couponWon &&
      auto &&
      auto.discount_amount > 0 &&
      auto.line_allocations?.length
    ) {
      discount_line_items = auto.line_allocations.map((row) => ({
        ...row,
        attribution: 'auto' as const,
      }));
    } else if (couponWon && merged.coupon_discount > 0 && lines.length > 0) {
      discount_line_items = allocateProportionalDiscount(
        merged.coupon_discount,
        lines,
      ).map((row) => ({ ...row, attribution: 'coupon' as const }));
    }

    const pricing_snapshot = buildPricingSnapshot({
      quote: merged,
      coupon: appliedCoupon
        ? { id: appliedCoupon.id, code: appliedCoupon.code }
        : null,
      discount_line_items,
    });

    const priced: PricedCheckoutSnapshot = {
      ...snapshot,
      subtotal_amount: subtotal,
      total_amount: merged.total_amount,
      discount_total: merged.discount_total,
      pricing_snapshot,
      applied_coupon_id: appliedCoupon?.id ?? null,
      record_coupon_usage: recordCouponUsage,
      winning_coupon_code:
        recordCouponUsage && appliedCoupon ? appliedCoupon.code : null,
      coupon_discount_applied: merged.coupon_discount,
    };

    return priced;
  }

  async finalizeCouponAfterOrder(
    userId: string,
    orderId: string,
    priced: PricedCheckoutSnapshot,
    manager: EntityManager,
  ): Promise<void> {
    if (!priced.record_coupon_usage || !priced.applied_coupon_id) {
      return;
    }
    const coupon = await this.promotionsRepository.lockCouponById(
      manager,
      priced.applied_coupon_id,
    );
    if (!coupon) {
      throw new BadRequestException({
        message: 'Coupon is no longer valid',
        details: { code: 'COUPON_INVALID' },
      });
    }
    const now = new Date();
    this.assertCouponBasics(coupon, now);
    this.assertCouponCartMinimum(coupon, priced.subtotal_amount);
    await this.assertUserCouponUsage(coupon.id, userId, manager);
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException({
        message: 'Coupon usage limit reached',
        details: { code: 'COUPON_USAGE_EXHAUSTED' },
      });
    }

    const discountForUsage = Math.max(0, priced.coupon_discount_applied);

    await this.promotionsRepository.incrementCouponUsedCount(
      manager,
      coupon.id,
    );
    await this.promotionsRepository.saveCouponUsage(manager, {
      couponId: coupon.id,
      userId,
      orderId,
      discountAmount: discountForUsage,
    });
  }

  async listCouponsAdmin(): Promise<CouponEntity[]> {
    return this.promotionsRepository.listCouponsAdmin();
  }

  async createCouponAdmin(row: Partial<CouponEntity>): Promise<CouponEntity> {
    const entity = this.couponsRepository.create({
      ...row,
      code: this.normalizeCouponCode(String(row.code ?? '')),
    });
    const saved = await this.promotionsRepository.saveCoupon(entity);
    await this.invalidateActivePromotionsCache();
    return saved;
  }

  async updateCouponAdmin(
    id: string,
    patch: Partial<CouponEntity>,
  ): Promise<CouponEntity> {
    const existing = await this.promotionsRepository.findCouponById(id);
    if (!existing) {
      throw new NotFoundException({
        message: 'Coupon not found',
        details: { code: 'COUPON_NOT_FOUND' },
      });
    }
    for (const key of Object.keys(patch) as (keyof CouponEntity)[]) {
      const v = patch[key];
      if (v === undefined) {
        continue;
      }
      if (key === 'code') {
        existing.code = this.normalizeCouponCode(String(v));
        continue;
      }
      (existing as unknown as Record<string, unknown>)[key] = v;
    }
    const saved = await this.promotionsRepository.saveCoupon(existing);
    await this.invalidateActivePromotionsCache();
    return saved;
  }

  async deleteCouponAdmin(id: string): Promise<void> {
    await this.promotionsRepository.softDeleteCoupon(id);
    await this.invalidateActivePromotionsCache();
  }

  async listCampaignsAdmin(): Promise<PromotionCampaignEntity[]> {
    return this.promotionsRepository.listCampaignsAdmin();
  }

  async createCampaignAdmin(
    row: Partial<PromotionCampaignEntity>,
  ): Promise<PromotionCampaignEntity> {
    const entity = this.campaignsWriteRepository.create(row);
    const saved = await this.promotionsRepository.saveCampaign(entity);
    await this.invalidateActivePromotionsCache();
    return saved;
  }

  async updateCampaignAdmin(
    id: string,
    patch: Partial<PromotionCampaignEntity>,
  ): Promise<PromotionCampaignEntity> {
    const existing = await this.promotionsRepository.findCampaignById(id);
    if (!existing) {
      throw new NotFoundException({
        message: 'Campaign not found',
        details: { code: 'CAMPAIGN_NOT_FOUND' },
      });
    }
    for (const key of Object.keys(patch) as (keyof PromotionCampaignEntity)[]) {
      const v = patch[key];
      if (v !== undefined) {
        (existing as unknown as Record<string, unknown>)[key] = v;
      }
    }
    const saved = await this.promotionsRepository.saveCampaign(existing);
    await this.invalidateActivePromotionsCache();
    return saved;
  }

  async deleteCampaignAdmin(id: string): Promise<void> {
    await this.promotionsRepository.softDeleteCampaign(id);
    await this.invalidateActivePromotionsCache();
  }

  async createRuleAdmin(
    campaignId: string,
    row: Partial<PromotionRuleEntity>,
  ): Promise<PromotionRuleEntity> {
    const campaign =
      await this.promotionsRepository.findCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundException({
        message: 'Campaign not found',
        details: { code: 'CAMPAIGN_NOT_FOUND' },
      });
    }
    const entity = this.rulesWriteRepository.create({
      ...row,
      campaignId,
    });
    const saved = await this.promotionsRepository.saveRule(entity);
    await this.invalidateActivePromotionsCache();
    return saved;
  }

  async updateRuleAdmin(
    id: string,
    patch: Partial<PromotionRuleEntity>,
  ): Promise<PromotionRuleEntity> {
    const existing = await this.promotionsRepository.findRuleById(id);
    if (!existing) {
      throw new NotFoundException({
        message: 'Rule not found',
        details: { code: 'RULE_NOT_FOUND' },
      });
    }
    for (const key of Object.keys(patch) as (keyof PromotionRuleEntity)[]) {
      const v = patch[key];
      if (v !== undefined) {
        (existing as unknown as Record<string, unknown>)[key] = v;
      }
    }
    const saved = await this.promotionsRepository.saveRule(existing);
    await this.invalidateActivePromotionsCache();
    return saved;
  }

  async deleteRuleAdmin(id: string): Promise<void> {
    await this.promotionsRepository.softDeleteRule(id);
    await this.invalidateActivePromotionsCache();
  }

  private filterCampaignsInWindow(
    campaigns: PromotionCampaignEntity[],
    now: Date,
  ): PromotionCampaignEntity[] {
    return campaigns.filter(
      (c) => c.startDate <= now && (!c.endDate || c.endDate >= now),
    );
  }

  private async buildCheckoutSnapshotForCart(
    cartId: string,
    userId: string,
  ): Promise<CheckoutCartSnapshot> {
    const subtotal = await this.sumCartSubtotal(cartId);
    const items = await this.loadCheckoutItems(cartId);
    const cart = await this.cartsRepository.findOne({
      where: { id: cartId, userId, status: CartStatus.ACTIVE },
    });
    return {
      cart_id: cartId,
      applied_coupon_id: cart?.appliedCouponId ?? null,
      items,
      subtotal_amount: subtotal,
      total_amount: subtotal,
    };
  }

  private async loadCheckoutItems(
    cartId: string,
  ): Promise<CheckoutCartSnapshot['items']> {
    const rows = await this.cartItemsRepository.find({
      where: { cartId },
      order: { createdAt: 'ASC' },
    });
    const products = await this.productsRepository.find({
      where: { id: In(rows.map((r) => r.productId)) },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    return rows.map((item) => {
      const product = productById.get(item.productId);
      return {
        product_id: item.productId,
        product_name: product?.name ?? 'Unavailable product',
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      };
    });
  }

  private async sumCartSubtotal(cartId: string): Promise<number> {
    const items = await this.cartItemsRepository.find({ where: { cartId } });
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  private async requireActiveCart(userId: string): Promise<CartEntity> {
    const cart = await this.cartsRepository.findOne({
      where: { userId, status: CartStatus.ACTIVE },
    });
    if (!cart) {
      throw new NotFoundException({
        message: 'Cart not found',
        details: { code: 'CART_NOT_FOUND' },
      });
    }
    return cart;
  }

  private assertCouponBasics(coupon: CouponEntity | null, now: Date): void {
    if (!coupon) {
      throw new BadRequestException({
        message: 'Coupon is expired or invalid',
        details: { code: 'COUPON_INVALID' },
      });
    }
    if (!coupon.isActive || coupon.deletedAt) {
      throw new BadRequestException({
        message: 'Coupon is not active',
        details: { code: 'COUPON_INACTIVE' },
      });
    }
    if (coupon.startDate > now) {
      throw new BadRequestException({
        message: 'Coupon is not yet valid',
        details: { code: 'COUPON_NOT_STARTED' },
      });
    }
    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException({
        message: 'Coupon has expired',
        details: { code: 'COUPON_EXPIRED' },
      });
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException({
        message: 'Coupon usage limit reached',
        details: { code: 'COUPON_USAGE_EXHAUSTED' },
      });
    }
  }

  private assertCouponCartMinimum(
    coupon: CouponEntity,
    subtotal: number,
  ): void {
    if (subtotal < coupon.minOrderValue) {
      throw new BadRequestException({
        message: 'Order subtotal is below coupon minimum',
        details: {
          code: 'COUPON_MIN_ORDER_NOT_MET',
          min_order_value: coupon.minOrderValue,
        },
      });
    }
  }

  private async assertUserCouponUsage(
    couponId: string,
    userId: string,
    manager: EntityManager | undefined,
  ): Promise<void> {
    const coupon = await (manager
      ? manager.getRepository(CouponEntity).findOne({ where: { id: couponId } })
      : this.couponsRepository.findOne({ where: { id: couponId } }));
    if (!coupon) {
      throw new BadRequestException({
        message: 'Coupon is expired or invalid',
        details: { code: 'COUPON_INVALID' },
      });
    }
    const count = await this.promotionsRepository.countUsagesForUser(
      manager,
      couponId,
      userId,
    );
    if (count >= coupon.maxUsesPerUser) {
      throw new BadRequestException({
        message:
          'You have already used this coupon the maximum number of times',
        details: { code: 'COUPON_USER_LIMIT' },
      });
    }
  }

  private async buildPricingLines(
    items: CheckoutCartSnapshot['items'],
    manager?: EntityManager,
  ): Promise<PricingLineInput[]> {
    if (!items.length) {
      return [];
    }
    const repo = manager
      ? manager.getRepository(ProductEntity)
      : this.productsRepository;
    const products = await repo.find({
      where: { id: In(items.map((i) => i.product_id)) },
    });
    const categoryByProduct = new Map(
      products.map((p) => [p.id, p.categoryId]),
    );
    return items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      category_id: categoryByProduct.get(item.product_id) ?? '',
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));
  }
}
