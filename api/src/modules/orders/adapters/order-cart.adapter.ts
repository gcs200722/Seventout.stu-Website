import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { CART_CACHE_PORT } from '../../cart/cart-cache.port';
import type { CartCachePort } from '../../cart/cart-cache.port';
import { ProductEntity } from '../../products/product.entity';
import { CartItemEntity } from '../../cart/entities/cart-item.entity';
import { CartEntity, CartStatus } from '../../cart/entities/cart.entity';
import { CheckoutCartSnapshot, OrderCartPort } from '../ports/order-cart.port';

@Injectable()
export class OrderCartAdapter implements OrderCartPort {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartsRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemsRepository: Repository<CartItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @Inject(CART_CACHE_PORT)
    private readonly cartCache: CartCachePort,
  ) {}

  async getCheckoutCart(
    userId: string,
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

    const cart = await cartsRepo.findOne({
      where: { id: cartId, userId, status: CartStatus.ACTIVE },
    });
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
    const normalizedItems = items.map((item) => {
      const product = productById.get(item.productId);
      return {
        product_id: item.productId,
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

  async clearCartAfterCheckout(userId: string, cartId: string): Promise<void> {
    await this.cartItemsRepository.delete({ cartId });
    const cart = await this.cartsRepository.findOne({
      where: { id: cartId, userId, status: CartStatus.ACTIVE },
    });
    if (!cart) {
      await this.cartCache.invalidate(userId);
      return;
    }
    cart.status = CartStatus.CHECKED_OUT;
    cart.appliedCouponId = null;
    await this.cartsRepository.save(cart);
    await this.cartsRepository.save(
      this.cartsRepository.create({ userId, status: CartStatus.ACTIVE }),
    );
    await this.cartCache.invalidate(userId);
  }
}
