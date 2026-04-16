import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { InventoryChannel } from '../inventory/inventory.types';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { OrdersService } from '../orders/orders.service';
import { ProductEntity } from '../products/product.entity';
import { CART_CACHE_PORT } from './cart-cache.port';
import type { CartCachePort, CartSnapshot } from './cart-cache.port';
import { CartIssue, CartIssueCode } from './cart.types';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity, CartStatus } from './entities/cart.entity';

type CartItemView = {
  item_id: string;
  product_id: string;
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
    @InjectRepository(InventoryEntity)
    private readonly inventoriesRepository: Repository<InventoryEntity>,
    private readonly ordersService: OrdersService,
    private readonly dataSource: DataSource,
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
    const stock = await this.getAvailableStock(product.id);

    const existing = await this.cartItemsRepository.findOne({
      where: { cartId: cart.id, productId: product.id },
    });
    if (existing) {
      const nextQuantity = existing.quantity + payload.quantity;
      if (stock < nextQuantity) {
        throw new BadRequestException({
          message: 'Not enough stock available',
          details: { code: 'OUT_OF_STOCK', product_id: product.id },
        });
      }
      existing.quantity = nextQuantity;
      existing.price = product.price;
      await this.cartItemsRepository.save(existing);
    } else {
      if (stock < payload.quantity) {
        throw new BadRequestException({
          message: 'Not enough stock available',
          details: { code: 'OUT_OF_STOCK', product_id: product.id },
        });
      }
      await this.cartItemsRepository.save(
        this.cartItemsRepository.create({
          cartId: cart.id,
          productId: product.id,
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
    const stock = await this.getAvailableStock(product.id);
    if (stock < payload.quantity) {
      throw new BadRequestException({
        message: 'Not enough stock available',
        details: { code: 'OUT_OF_STOCK', product_id: product.id },
      });
    }

    item.quantity = payload.quantity;
    item.price = product.price;
    await this.cartItemsRepository.save(item);
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

  async checkout(
    userId: string,
    _payload: CheckoutCartDto,
  ): Promise<{
    reserved_items: number;
    idempotency_key?: string;
  }> {
    const cart = await this.ensureActiveCart(userId);
    const validation = await this.validateCartById(cart.id);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Some items are out of stock',
        details: { code: 'CART_INVALID', issues: validation.issues },
      });
    }

    const items = await this.cartItemsRepository.find({
      where: { cartId: cart.id },
    });
    if (!items.length) {
      throw new BadRequestException({
        message: 'Cart is empty',
        details: { code: 'CART_EMPTY' },
      });
    }

    const reserved: CartItemEntity[] = [];
    try {
      for (const item of items) {
        await this.ordersService.reserveStock(item.productId, item.quantity);
        reserved.push(item);
      }
    } catch (error) {
      for (const item of reserved.reverse()) {
        await this.ordersService.releaseStock(item.productId, item.quantity);
      }
      throw error;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(CartItemEntity, { cartId: cart.id });
      cart.status = CartStatus.CHECKED_OUT;
      await manager.save(cart);
      await manager.save(
        this.cartsRepository.create({ userId, status: CartStatus.ACTIVE }),
      );
    });
    await this.cartCache.invalidate(userId);

    return {
      reserved_items: reserved.length,
      idempotency_key: _payload.idempotency_key,
    };
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

    const inventories = await this.inventoriesRepository.find({
      where: {
        productId: In(items.map((item) => item.productId)),
        channel: InventoryChannel.INTERNAL,
      },
    });
    const availableByProductId = new Map(
      inventories.map((inventory) => [
        inventory.productId,
        inventory.availableStock,
      ]),
    );

    const issues: CartIssue[] = [];
    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product || !product.isActive || product.deletedAt) {
        issues.push({
          code: CartIssueCode.PRODUCT_UNAVAILABLE,
          product_id: item.productId,
          message: 'Product is unavailable',
        });
        continue;
      }

      if (product.price !== item.price) {
        issues.push({
          code: CartIssueCode.PRICE_CHANGED,
          product_id: item.productId,
          message: 'Product price changed',
        });
      }

      const availableStock = availableByProductId.get(item.productId) ?? 0;
      if (availableStock < item.quantity) {
        issues.push({
          code: CartIssueCode.OUT_OF_STOCK,
          product_id: item.productId,
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

    const inventories = await this.inventoriesRepository.find({
      where: {
        productId: In(items.map((item) => item.productId)),
        channel: InventoryChannel.INTERNAL,
      },
    });
    const availableByProductId = new Map(
      inventories.map((inventory) => [
        inventory.productId,
        inventory.availableStock,
      ]),
    );

    const dataItems: CartItemView[] = items.map((item) => {
      const product = productById.get(item.productId);
      return {
        item_id: item.id,
        product_id: item.productId,
        product_name: product?.name ?? 'Unavailable product',
        price: item.price,
        quantity: item.quantity,
        available_stock: availableByProductId.get(item.productId) ?? 0,
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

  private async getAvailableStock(productId: string): Promise<number> {
    const inventory = await this.inventoriesRepository.findOne({
      where: { productId, channel: InventoryChannel.INTERNAL },
    });
    return inventory?.availableStock ?? 0;
  }
}
