import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InventoryChannel } from '../inventory/inventory.types';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ProductEntity } from '../products/product.entity';
import { ProductVariantEntity } from '../products/product-variant.entity';
import { CART_CACHE_PORT } from './cart-cache.port';
import type { CartCachePort, CartSnapshot } from './cart-cache.port';
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
  ) {}

  async getCurrentCart(userId: string): Promise<CartSnapshot> {
    const cached = await this.cartCache.get(userId);
    if (cached) {
      return cached;
    }
    const cart = await this.ensureActiveCart(userId);
    const payload = await this.buildSnapshot(cart.id);
    await this.cartCache.set(userId, payload);
    return payload;
  }

  async addItem(userId: string, payload: AddCartItemDto): Promise<void> {
    const cart = await this.ensureActiveCart(userId);
    const product = await this.getActiveProduct(payload.product_id);
    const variant = await this.getVariantForProduct(
      payload.product_variant_id,
      product.id,
    );
    const stock = await this.getAvailableStock(variant.id);

    const existing = await this.cartItemsRepository.findOne({
      where: {
        cartId: cart.id,
        productId: product.id,
        productVariantId: variant.id,
      },
    });
    if (existing) {
      const nextQuantity = existing.quantity + payload.quantity;
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
      await this.cartItemsRepository.save(existing);
    } else {
      if (stock < payload.quantity) {
        throw new BadRequestException({
          message: 'Not enough stock available',
          details: {
            code: 'OUT_OF_STOCK',
            product_id: product.id,
            product_variant_id: variant.id,
          },
        });
      }
      await this.cartItemsRepository.save(
        this.cartItemsRepository.create({
          cartId: cart.id,
          productId: product.id,
          productVariantId: variant.id,
          quantity: payload.quantity,
          price: product.price,
        }),
      );
    }

    await this.cartCache.invalidate(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    payload: UpdateCartItemDto,
  ): Promise<void> {
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

    const product = await this.getActiveProduct(item.productId);
    const targetVariantId =
      payload.product_variant_id && payload.product_variant_id.trim().length > 0
        ? payload.product_variant_id.trim()
        : item.productVariantId;
    await this.getVariantForProduct(targetVariantId, product.id);

    const existingSameVariant = await this.cartItemsRepository.findOne({
      where: {
        cartId: cart.id,
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
    await this.cartCache.invalidate(userId);
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
    await this.cartCache.invalidate(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.ensureActiveCart(userId);
    await this.cartItemsRepository.delete({ cartId: cart.id });
    await this.cartCache.invalidate(userId);
  }

  async validateCart(userId: string): Promise<ValidateCartResult> {
    const cart = await this.ensureActiveCart(userId);
    return this.validateCartById(cart.id);
  }

  private async ensureActiveCart(userId: string): Promise<CartEntity> {
    let cart = await this.cartsRepository.findOne({
      where: { userId, status: CartStatus.ACTIVE },
    });
    if (!cart) {
      cart = await this.cartsRepository.save(
        this.cartsRepository.create({
          userId,
          status: CartStatus.ACTIVE,
        }),
      );
    }
    return cart;
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
