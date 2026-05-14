import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { InventoryChannel } from '../inventory/inventory.types';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ProductEntity } from '../products/product.entity';
import { ProductVariantEntity } from '../products/product-variant.entity';
import { CART_CACHE_PORT } from './cart-cache.port';
import type {
  CartCacheOwner,
  CartCachePort,
  CartSnapshot,
} from './cart-cache.port';
import { CartIssue, CartIssueCode } from './cart.types';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity, CartStatus } from './entities/cart.entity';

type CartItemView = {
  item_id: string;
  product_id: string;
  product_variant_id: string;
  variant_color: string;
  variant_size: string;
  product_name: string;
  price: number;
  quantity: number;
  available_stock: number;
  subtotal: number;
};

type ValidateCartResult = {
  valid: boolean;
  issues: CartIssue[];
};

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartsRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemsRepository: Repository<CartItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantsRepository: Repository<ProductVariantEntity>,
    @InjectRepository(InventoryEntity)
    private readonly inventoriesRepository: Repository<InventoryEntity>,
    @Inject(CART_CACHE_PORT) private readonly cartCache: CartCachePort,
    private readonly dataSource: DataSource,
  ) {}

  private userOwner(userId: string): CartCacheOwner {
    return { kind: 'user', userId };
  }

  private guestOwner(sessionId: string): CartCacheOwner {
    return { kind: 'guest', sessionId };
  }

  async getCurrentCart(userId: string): Promise<CartSnapshot> {
    const owner = this.userOwner(userId);
    const cached = await this.cartCache.get(owner);
    if (cached) {
      return cached;
    }
    const cart = await this.ensureActiveCart(userId);
    const payload = await this.buildSnapshot(cart.id);
    await this.cartCache.set(owner, payload);
    return payload;
  }

  async getCurrentCartGuest(sessionId: string): Promise<CartSnapshot> {
    const owner = this.guestOwner(sessionId);
    const cached = await this.cartCache.get(owner);
    if (cached) {
      return cached;
    }
    const cart = await this.ensureActiveGuestCart(sessionId);
    const payload = await this.buildSnapshot(cart.id);
    await this.cartCache.set(owner, payload);
    return payload;
  }

  async addItem(userId: string, payload: AddCartItemDto): Promise<void> {
    const cart = await this.ensureActiveCart(userId);
    await this.addOrIncrementLine(
      cart.id,
      payload.product_id,
      payload.product_variant_id,
      payload.quantity,
    );
    await this.cartCache.invalidate(this.userOwner(userId));
  }

  async addItemGuest(
    sessionId: string,
    payload: AddCartItemDto,
  ): Promise<void> {
    const cart = await this.ensureActiveGuestCart(sessionId);
    await this.addOrIncrementLine(
      cart.id,
      payload.product_id,
      payload.product_variant_id,
      payload.quantity,
    );
    await this.cartCache.invalidate(this.guestOwner(sessionId));
  }

  async updateItem(
    userId: string,
    itemId: string,
    payload: UpdateCartItemDto,
  ): Promise<void> {
    const cart = await this.ensureActiveCart(userId);
    await this.updateItemOnCart(cart.id, itemId, payload);
    await this.cartCache.invalidate(this.userOwner(userId));
  }

  async updateItemGuest(
    sessionId: string,
    itemId: string,
    payload: UpdateCartItemDto,
  ): Promise<void> {
    const cart = await this.ensureActiveGuestCart(sessionId);
    await this.updateItemOnCart(cart.id, itemId, payload);
    await this.cartCache.invalidate(this.guestOwner(sessionId));
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const cart = await this.ensureActiveCart(userId);
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException({
        message: 'Cart item not found',
        details: { code: 'CART_ITEM_NOT_FOUND' },
      });
    }
    await this.cartItemsRepository.delete(item.id);
    await this.cartCache.invalidate(this.userOwner(userId));
  }

  async removeItemGuest(sessionId: string, itemId: string): Promise<void> {
    const cart = await this.ensureActiveGuestCart(sessionId);
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException({
        message: 'Cart item not found',
        details: { code: 'CART_ITEM_NOT_FOUND' },
      });
    }
    await this.cartItemsRepository.delete(item.id);
    await this.cartCache.invalidate(this.guestOwner(sessionId));
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.ensureActiveCart(userId);
    await this.cartItemsRepository.delete({ cartId: cart.id });
    await this.cartCache.invalidate(this.userOwner(userId));
  }

  async clearCartGuest(sessionId: string): Promise<void> {
    const cart = await this.ensureActiveGuestCart(sessionId);
    await this.cartItemsRepository.delete({ cartId: cart.id });
    await this.cartCache.invalidate(this.guestOwner(sessionId));
  }

  async validateCart(userId: string): Promise<ValidateCartResult> {
    const cart = await this.ensureActiveCart(userId);
    return this.validateCartById(cart.id);
  }

  async validateCartGuest(sessionId: string): Promise<ValidateCartResult> {
    const cart = await this.ensureActiveGuestCart(sessionId);
    return this.validateCartById(cart.id);
  }

  /**
   * Merges guest cart lines into the user's active cart, then closes the guest cart.
   */
  async mergeGuestCartIntoUser(
    userId: string,
    guestSessionId: string,
  ): Promise<void> {
    const guestCart = await this.cartsRepository.findOne({
      where: {
        guestSessionId,
        userId: IsNull(),
        status: CartStatus.ACTIVE,
      },
    });
    if (!guestCart) {
      await this.cartCache.invalidate(this.guestOwner(guestSessionId));
      return;
    }

    const guestItems = await this.cartItemsRepository.find({
      where: { cartId: guestCart.id },
    });
    if (guestItems.length === 0) {
      guestCart.status = CartStatus.CHECKED_OUT;
      guestCart.appliedCouponId = null;
      await this.cartsRepository.save(guestCart);
      await this.cartCache.invalidate(this.guestOwner(guestSessionId));
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const userCart = await this.ensureActiveCartInManager(manager, userId);
      const itemRepo = manager.getRepository(CartItemEntity);
      for (const gi of guestItems) {
        await this.addOrIncrementLineInManager(
          manager,
          userCart.id,
          gi.productId,
          gi.productVariantId,
          gi.quantity,
        );
      }
      await itemRepo.delete({ cartId: guestCart.id });
      guestCart.status = CartStatus.CHECKED_OUT;
      guestCart.appliedCouponId = null;
      await manager.getRepository(CartEntity).save(guestCart);
    });

    await this.cartCache.invalidate(this.userOwner(userId));
    await this.cartCache.invalidate(this.guestOwner(guestSessionId));
  }

  private async ensureActiveCart(userId: string): Promise<CartEntity> {
    let cart = await this.cartsRepository.findOne({
      where: {
        userId,
        guestSessionId: IsNull(),
        status: CartStatus.ACTIVE,
      },
    });
    if (!cart) {
      cart = await this.cartsRepository.save(
        this.cartsRepository.create({
          userId,
          guestSessionId: null,
          status: CartStatus.ACTIVE,
        }),
      );
    }
    return cart;
  }

  private async ensureActiveGuestCart(sessionId: string): Promise<CartEntity> {
    let cart = await this.cartsRepository.findOne({
      where: {
        guestSessionId: sessionId,
        userId: IsNull(),
        status: CartStatus.ACTIVE,
      },
    });
    if (!cart) {
      cart = await this.cartsRepository.save(
        this.cartsRepository.create({
          userId: null,
          guestSessionId: sessionId,
          status: CartStatus.ACTIVE,
        }),
      );
    }
    return cart;
  }

  private async ensureActiveCartInManager(
    manager: import('typeorm').EntityManager,
    userId: string,
  ): Promise<CartEntity> {
    const repo = manager.getRepository(CartEntity);
    let cart = await repo.findOne({
      where: {
        userId,
        guestSessionId: IsNull(),
        status: CartStatus.ACTIVE,
      },
    });
    if (!cart) {
      cart = await repo.save(
        repo.create({
          userId,
          guestSessionId: null,
          status: CartStatus.ACTIVE,
        }),
      );
    }
    return cart;
  }

  private async addOrIncrementLine(
    cartId: string,
    productId: string,
    productVariantId: string,
    quantity: number,
  ): Promise<void> {
    await this.addOrIncrementLineInManager(
      this.dataSource.manager,
      cartId,
      productId,
      productVariantId,
      quantity,
    );
  }

  private async addOrIncrementLineInManager(
    manager: import('typeorm').EntityManager,
    cartId: string,
    productId: string,
    productVariantId: string,
    quantity: number,
  ): Promise<void> {
    const itemRepo = manager.getRepository(CartItemEntity);
    const productRepo = manager.getRepository(ProductEntity);
    const variantRepo = manager.getRepository(ProductVariantEntity);
    const invRepo = manager.getRepository(InventoryEntity);

    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product || product.deletedAt || !product.isActive) {
      throw new NotFoundException({
        message: 'Product not found',
        details: { code: 'PRODUCT_UNAVAILABLE', product_id: productId },
      });
    }
    const variant = await variantRepo.findOne({
      where: { id: productVariantId, productId },
    });
    if (!variant) {
      throw new BadRequestException({
        message: 'Invalid product variant',
        details: {
          code: 'INVALID_VARIANT',
          product_id: productId,
          product_variant_id: productVariantId,
        },
      });
    }
    const inventory = await invRepo.findOne({
      where: {
        productVariantId: variant.id,
        channel: InventoryChannel.INTERNAL,
      },
    });
    const stock = inventory?.availableStock ?? 0;

    const existing = await itemRepo.findOne({
      where: {
        cartId,
        productId: product.id,
        productVariantId: variant.id,
      },
    });
    if (existing) {
      const nextQuantity = existing.quantity + quantity;
      if (stock < nextQuantity) {
        throw new BadRequestException({
          message: 'Not enough stock available',
          details: {
            code: 'OUT_OF_STOCK',
            product_id: product.id,
            product_variant_id: variant.id,
          },
        });
      }
      existing.quantity = nextQuantity;
      existing.price = product.price;
      await itemRepo.save(existing);
    } else {
      if (stock < quantity) {
        throw new BadRequestException({
          message: 'Not enough stock available',
          details: {
            code: 'OUT_OF_STOCK',
            product_id: product.id,
            product_variant_id: variant.id,
          },
        });
      }
      await itemRepo.save(
        itemRepo.create({
          cartId,
          productId: product.id,
          productVariantId: variant.id,
          quantity,
          price: product.price,
        }),
      );
    }
  }

  private async updateItemOnCart(
    cartId: string,
    itemId: string,
    payload: UpdateCartItemDto,
  ): Promise<void> {
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, cartId },
    });
    if (!item) {
      throw new NotFoundException({
        message: 'Cart item not found',
        details: { code: 'CART_ITEM_NOT_FOUND' },
      });
    }

    const product = await this.getActiveProduct(item.productId);
    const targetVariantId =
      payload.product_variant_id && payload.product_variant_id.trim().length > 0
        ? payload.product_variant_id.trim()
        : item.productVariantId;
    await this.getVariantForProduct(targetVariantId, product.id);

    const existingSameVariant = await this.cartItemsRepository.findOne({
      where: {
        cartId,
        productId: product.id,
        productVariantId: targetVariantId,
      },
    });
    const shouldMerge =
      existingSameVariant !== null && existingSameVariant.id !== item.id;
    const requiredQuantity = shouldMerge
      ? existingSameVariant.quantity + payload.quantity
      : payload.quantity;
    const stock = await this.getAvailableStock(targetVariantId);
    if (stock < requiredQuantity) {
      throw new BadRequestException({
        message: 'Not enough stock available',
        details: {
          code: 'OUT_OF_STOCK',
          product_id: product.id,
          product_variant_id: targetVariantId,
        },
      });
    }

    if (shouldMerge) {
      existingSameVariant.quantity = requiredQuantity;
      existingSameVariant.price = product.price;
      await this.cartItemsRepository.save(existingSameVariant);
      await this.cartItemsRepository.delete(item.id);
    } else {
      item.productVariantId = targetVariantId;
      item.quantity = payload.quantity;
      item.price = product.price;
      await this.cartItemsRepository.save(item);
    }
  }

  private async validateCartById(cartId: string): Promise<ValidateCartResult> {
    const items = await this.cartItemsRepository.find({ where: { cartId } });
    if (!items.length) {
      return { valid: true, issues: [] };
    }

    const products = await this.productsRepository.find({
      where: { id: In(items.map((item) => item.productId)) },
    });
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    const variants = await this.variantsRepository.find({
      where: { id: In(items.map((item) => item.productVariantId)) },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const inventories = await this.inventoriesRepository.find({
      where: {
        productVariantId: In(items.map((item) => item.productVariantId)),
        channel: InventoryChannel.INTERNAL,
      },
    });
    const availableByVariantId = new Map(
      inventories.map((inventory) => [
        inventory.productVariantId,
        inventory.availableStock,
      ]),
    );

    const issues: CartIssue[] = [];
    for (const item of items) {
      const product = productById.get(item.productId);
      const variant = variantById.get(item.productVariantId);
      if (!product || !product.isActive || product.deletedAt) {
        issues.push({
          code: CartIssueCode.PRODUCT_UNAVAILABLE,
          product_id: item.productId,
          product_variant_id: item.productVariantId,
          message: 'Product is unavailable',
        });
        continue;
      }
      if (!variant || variant.productId !== item.productId) {
        issues.push({
          code: CartIssueCode.PRODUCT_UNAVAILABLE,
          product_id: item.productId,
          product_variant_id: item.productVariantId,
          message: 'Product variant is unavailable',
        });
        continue;
      }

      if (product.price !== item.price) {
        issues.push({
          code: CartIssueCode.PRICE_CHANGED,
          product_id: item.productId,
          product_variant_id: item.productVariantId,
          message: 'Product price changed',
        });
      }

      const availableStock =
        availableByVariantId.get(item.productVariantId) ?? 0;
      if (availableStock < item.quantity) {
        issues.push({
          code: CartIssueCode.OUT_OF_STOCK,
          product_id: item.productId,
          product_variant_id: item.productVariantId,
          message: 'Product is out of stock',
        });
      }
    }
    return { valid: issues.length === 0, issues };
  }

  private async buildSnapshot(cartId: string): Promise<CartSnapshot> {
    const items = await this.cartItemsRepository.find({
      where: { cartId },
      order: { createdAt: 'ASC' },
    });
    if (!items.length) {
      return {
        cart_id: cartId,
        items: [],
        total_amount: 0,
        total_items: 0,
      };
    }

    const products = await this.productsRepository.find({
      where: { id: In(items.map((item) => item.productId)) },
    });
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    const variants = await this.variantsRepository.find({
      where: { id: In(items.map((item) => item.productVariantId)) },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const inventories = await this.inventoriesRepository.find({
      where: {
        productVariantId: In(items.map((item) => item.productVariantId)),
        channel: InventoryChannel.INTERNAL,
      },
    });
    const availableByVariantId = new Map(
      inventories.map((inventory) => [
        inventory.productVariantId,
        inventory.availableStock,
      ]),
    );

    const dataItems: CartItemView[] = items.map((item) => {
      const product = productById.get(item.productId);
      const variant = variantById.get(item.productVariantId);
      return {
        item_id: item.id,
        product_id: item.productId,
        product_variant_id: item.productVariantId,
        variant_color: variant?.color ?? '',
        variant_size: variant?.size ?? '',
        product_name: product?.name ?? 'Unavailable product',
        price: item.price,
        quantity: item.quantity,
        available_stock: availableByVariantId.get(item.productVariantId) ?? 0,
        subtotal: item.price * item.quantity,
      };
    });

    return {
      cart_id: cartId,
      items: dataItems,
      total_items: dataItems.reduce((sum, item) => sum + item.quantity, 0),
      total_amount: dataItems.reduce((sum, item) => sum + item.subtotal, 0),
    };
  }

  private async getActiveProduct(productId: string): Promise<ProductEntity> {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });
    if (!product || product.deletedAt || !product.isActive) {
      throw new NotFoundException({
        message: 'Product not found',
        details: { code: 'PRODUCT_UNAVAILABLE', product_id: productId },
      });
    }
    return product;
  }

  private async getVariantForProduct(
    variantId: string,
    productId: string,
  ): Promise<ProductVariantEntity> {
    const variant = await this.variantsRepository.findOne({
      where: { id: variantId, productId },
    });
    if (!variant) {
      throw new BadRequestException({
        message: 'Invalid product variant',
        details: {
          code: 'INVALID_VARIANT',
          product_id: productId,
          product_variant_id: variantId,
        },
      });
    }
    return variant;
  }

  private async getAvailableStock(productVariantId: string): Promise<number> {
    const inventory = await this.inventoriesRepository.findOne({
      where: { productVariantId, channel: InventoryChannel.INTERNAL },
    });
    return inventory?.availableStock ?? 0;
  }
}
