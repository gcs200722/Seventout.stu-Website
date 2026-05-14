import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { CART_CACHE_PORT } from '../../cart/cart-cache.port';
import type { CartCacheOwner, CartCachePort } from '../../cart/cart-cache.port';
import { ProductEntity } from '../../products/product.entity';
import { ProductVariantEntity } from '../../products/product-variant.entity';
import { CartItemEntity } from '../../cart/entities/cart-item.entity';
import { CartEntity, CartStatus } from '../../cart/entities/cart.entity';
import {
  CheckoutCartSnapshot,
  OrderCartOwner,
  OrderCartPort,
} from '../ports/order-cart.port';

@Injectable()
export class OrderCartAdapter implements OrderCartPort {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartsRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemsRepository: Repository<CartItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantsRepository: Repository<ProductVariantEntity>,
    @Inject(CART_CACHE_PORT)
    private readonly cartCache: CartCachePort,
  ) {}

  private cacheOwnerFromOrderOwner(owner: OrderCartOwner): CartCacheOwner {
    return owner.type === 'user'
      ? { kind: 'user', userId: owner.userId }
      : { kind: 'guest', sessionId: owner.sessionId };
  }

  async getCheckoutCart(
    owner: OrderCartOwner,
    cartId: string,
    manager?: EntityManager,
  ): Promise<CheckoutCartSnapshot> {
    const cartsRepo = manager
      ? manager.getRepository(CartEntity)
      : this.cartsRepository;
    const itemsRepo = manager
      ? manager.getRepository(CartItemEntity)
      : this.cartItemsRepository;
    const productsRepo = manager
      ? manager.getRepository(ProductEntity)
      : this.productsRepository;
    const variantsRepo = manager
      ? manager.getRepository(ProductVariantEntity)
      : this.variantsRepository;

    const where =
      owner.type === 'user'
        ? {
            id: cartId,
            userId: owner.userId,
            guestSessionId: IsNull(),
            status: CartStatus.ACTIVE,
          }
        : {
            id: cartId,
            guestSessionId: owner.sessionId,
            userId: IsNull(),
            status: CartStatus.ACTIVE,
          };

    const cart = await cartsRepo.findOne({ where });
    if (!cart) {
      throw new BadRequestException({
        message: 'Cart is invalid for checkout',
        details: { code: 'CART_INVALID', cart_id: cartId },
      });
    }
    const items = await itemsRepo.find({
      where: { cartId: cart.id },
      order: { createdAt: 'ASC' },
    });
    if (!items.length) {
      throw new BadRequestException({
        message: 'Cart is empty',
        details: { code: 'CART_EMPTY' },
      });
    }
    const products = await productsRepo.find({
      where: { id: In(items.map((item) => item.productId)) },
    });
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const variants = await variantsRepo.find({
      where: { id: In(items.map((item) => item.productVariantId)) },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const normalizedItems = items.map((item) => {
      const product = productById.get(item.productId);
      const variant = variantById.get(item.productVariantId);
      return {
        product_id: item.productId,
        product_variant_id: item.productVariantId,
        variant_color: variant?.color ?? '',
        variant_size: variant?.size ?? '',
        product_name: product?.name ?? 'Unavailable product',
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      };
    });
    const subtotal = normalizedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    return {
      cart_id: cart.id,
      applied_coupon_id: cart.appliedCouponId,
      items: normalizedItems,
      subtotal_amount: subtotal,
      total_amount: subtotal,
    };
  }

  async clearCartAfterCheckout(
    owner: OrderCartOwner,
    cartId: string,
  ): Promise<void> {
    await this.cartItemsRepository.delete({ cartId });
    const where =
      owner.type === 'user'
        ? {
            id: cartId,
            userId: owner.userId,
            guestSessionId: IsNull(),
            status: CartStatus.ACTIVE,
          }
        : {
            id: cartId,
            guestSessionId: owner.sessionId,
            userId: IsNull(),
            status: CartStatus.ACTIVE,
          };

    const cart = await this.cartsRepository.findOne({ where });
    const cacheOwner = this.cacheOwnerFromOrderOwner(owner);
    if (!cart) {
      await this.cartCache.invalidate(cacheOwner);
      return;
    }
    cart.status = CartStatus.CHECKED_OUT;
    cart.appliedCouponId = null;
    await this.cartsRepository.save(cart);
    if (owner.type === 'user') {
      await this.cartsRepository.save(
        this.cartsRepository.create({
          userId: owner.userId,
          guestSessionId: null,
          status: CartStatus.ACTIVE,
        }),
      );
    } else {
      await this.cartsRepository.save(
        this.cartsRepository.create({
          userId: null,
          guestSessionId: owner.sessionId,
          status: CartStatus.ACTIVE,
        }),
      );
    }
    await this.cartCache.invalidate(cacheOwner);
  }
}
