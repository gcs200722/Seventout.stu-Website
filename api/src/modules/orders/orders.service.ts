import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AddressEntity } from '../address/entities/address.entity';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/payments.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderEventOutboxEntity } from './entities/order-event-outbox.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderEventDispatcherService } from './events/order-event-dispatcher.service';
import { ORDER_CART_PORT } from './ports/order-cart.port';
import type { OrderCartPort } from './ports/order-cart.port';
import { ORDER_INVENTORY_PORT } from './ports/order-inventory.port';
import type { OrderInventoryPort } from './ports/order-inventory.port';
import {
  FulfillmentStatus,
  OrderEventType,
  OrderStatus,
  PaymentStatus,
  ShippingAddressSnapshot,
} from './orders.types';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemsRepository: Repository<OrderItemEntity>,
    @InjectRepository(OrderEventOutboxEntity)
    private readonly outboxRepository: Repository<OrderEventOutboxEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressesRepository: Repository<AddressEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @Inject(ORDER_CART_PORT) private readonly cartPort: OrderCartPort,
    @Inject(ORDER_INVENTORY_PORT)
    private readonly inventoryPort: OrderInventoryPort,
    private readonly dataSource: DataSource,
    private readonly eventDispatcher: OrderEventDispatcherService,
  ) {}

  async createOrder(
    user: AuthenticatedUser,
    payload: CreateOrderDto,
    idempotencyKey?: string,
  ): Promise<{
    order_id: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    total_amount: number;
    idempotency_key: string;
  }> {
    const normalizedKey = (
      idempotencyKey || `${user.id}:${payload.cart_id}`
    ).trim();
    const duplicatedOrder = await this.ordersRepository.findOne({
      where: { note: this.buildIdempotencyNote(payload.note, normalizedKey) },
    });
    if (duplicatedOrder) {
      return {
        order_id: duplicatedOrder.id,
        status: duplicatedOrder.status,
        payment_status: duplicatedOrder.paymentStatus,
        total_amount: duplicatedOrder.totalAmount,
        idempotency_key: normalizedKey,
      };
    }

    const cartSnapshot = await this.cartPort.getCheckoutCart(
      user.id,
      payload.cart_id,
    );
    const address = await this.addressesRepository.findOne({
      where: { id: payload.address_id, userId: user.id },
    });
    if (!address) {
      throw new NotFoundException({
        message: 'Address not found',
        details: { code: 'ADDRESS_NOT_FOUND' },
      });
    }
    const shippingAddressSnapshot: ShippingAddressSnapshot = {
      full_name: address.fullName,
      phone: address.phone,
      address_line: address.addressLine,
      ward: address.ward,
      district: address.district,
      city: address.city,
      country: address.country,
    };
    const createdOrder = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(OrderEntity);
      const itemRepo = manager.getRepository(OrderItemEntity);
      const outboxRepo = manager.getRepository(OrderEventOutboxEntity);

      const order = await orderRepo.save(
        orderRepo.create({
          userId: user.id,
          addressId: address.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          totalAmount: cartSnapshot.total_amount,
          shippingAddress: shippingAddressSnapshot,
          note: this.buildIdempotencyNote(payload.note, normalizedKey),
        }),
      );

      const items = cartSnapshot.items.map((item) =>
        itemRepo.create({
          orderId: order.id,
          productId: item.product_id,
          productName: item.product_name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        }),
      );
      await itemRepo.save(items);

      await outboxRepo.save(
        outboxRepo.create({
          orderId: order.id,
          eventType: OrderEventType.ORDER_CREATED,
          payload: {
            order_id: order.id,
            items: items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
            })),
          },
        }),
      );
      return order;
    });

    await this.cartPort.clearCartAfterCheckout(user.id, payload.cart_id);
    await this.processOutbox();

    return {
      order_id: createdOrder.id,
      status: createdOrder.status,
      payment_status: createdOrder.paymentStatus,
      total_amount: createdOrder.totalAmount,
      idempotency_key: normalizedKey,
    };
  }

  async listOrders(user: AuthenticatedUser, query: ListOrdersQueryDto) {
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .where('order.deleted_at IS NULL');

    if (user.role === UserRole.USER) {
      qb.andWhere('order.user_id = :userId', { userId: user.id });
    }
    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }
    if (query.payment_status) {
      qb.andWhere('order.payment_status = :paymentStatus', {
        paymentStatus: query.payment_status,
      });
    }

    qb.orderBy('order.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    const paymentMethods = await this.getLatestPaymentMethods(
      items.map((item) => item.id),
    );
    return {
      items: items.map((item) => ({
        ...item,
        note: this.sanitizeOrderNote(item.note),
        paymentMethod: paymentMethods[item.id] ?? null,
      })),
      total,
    };
  }

  async getOrderById(user: AuthenticatedUser, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      withDeleted: false,
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    if (user.role === UserRole.USER && order.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You cannot access this order',
        details: { code: 'ORDER_FORBIDDEN' },
      });
    }
    const items = await this.orderItemsRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
    const paymentMethods = await this.getLatestPaymentMethods([orderId]);
    return {
      id: order.id,
      status: order.status,
      payment_status: order.paymentStatus,
      payment_method: paymentMethods[orderId] ?? null,
      total_amount: order.totalAmount,
      note: this.sanitizeOrderNote(order.note),
      shipping_address: order.shippingAddress,
      items: items.map((item) => ({
        product_id: item.productId,
        product_name: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      created_at: order.createdAt,
    };
  }

  async cancelOrder(user: AuthenticatedUser, orderId: string): Promise<void> {
    const order = await this.guardOrderAccess(user, orderId);
    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new BadRequestException({
        message: 'Order cannot be canceled at this stage',
        details: { code: 'ORDER_STATUS_INVALID' },
      });
    }
    const items = await this.orderItemsRepository.find({ where: { orderId } });
    order.status = OrderStatus.CANCELED;
    order.canceledAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.save(order);
      await manager.save(
        manager.create(OrderEventOutboxEntity, {
          orderId,
          eventType: OrderEventType.ORDER_CANCELED,
          payload: {
            order_id: orderId,
            items: items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
            })),
          },
        }),
      );
    });
    await this.processOutbox();
  }

  async updateStatus(
    orderId: string,
    payload: UpdateOrderStatusDto,
  ): Promise<{ status: OrderStatus }> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    this.ensureValidTransition(order.status, payload.status);
    order.status = payload.status;
    if (payload.status === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
    }
    await this.ordersRepository.save(order);

    if (payload.status === OrderStatus.COMPLETED) {
      const items = await this.orderItemsRepository.find({
        where: { orderId },
      });
      await this.outboxRepository.save(
        this.outboxRepository.create({
          orderId,
          eventType: OrderEventType.ORDER_COMPLETED,
          payload: {
            order_id: orderId,
            items: items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
            })),
          },
        }),
      );
      await this.processOutbox();
    }
    return { status: order.status };
  }

  async markOrderPaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
  ): Promise<{ payment_status: PaymentStatus }> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }

    this.ensureValidPaymentTransition(order.paymentStatus, paymentStatus);
    order.paymentStatus = paymentStatus;
    await this.ordersRepository.save(order);
    return { payment_status: order.paymentStatus };
  }

  async processOutbox(): Promise<void> {
    const events = await this.outboxRepository.find({
      where: { processedAt: IsNull() },
      order: { createdAt: 'ASC' },
      take: 50,
    });
    for (const event of events) {
      try {
        await this.eventDispatcher.dispatch(event);
        event.processedAt = new Date();
        event.failedAt = null;
        event.errorMessage = null;
      } catch (error) {
        event.retryCount += 1;
        event.failedAt = new Date();
        event.errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown event dispatch failure';
      }
      await this.outboxRepository.save(event);
    }
  }

  async reserveStock(productId: string, quantity: number): Promise<void> {
    await this.inventoryPort.reserveStock(
      productId,
      quantity,
      'Order created: reserve stock',
    );
  }

  async releaseStock(productId: string, quantity: number): Promise<void> {
    await this.inventoryPort.releaseStock(
      productId,
      quantity,
      'Order canceled: release stock',
    );
  }

  async completeStockOut(productId: string, quantity: number): Promise<void> {
    await this.inventoryPort.commitStockOut(
      productId,
      quantity,
      'Order completed: commit stock out',
    );
  }

  private ensureValidTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): void {
    const flow: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELED]: [],
    };
    if (!flow[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException({
        message: 'Order status transition is invalid',
        details: {
          code: 'ORDER_STATUS_INVALID',
          current_status: currentStatus,
          next_status: nextStatus,
        },
      });
    }
  }

  private ensureValidPaymentTransition(
    currentStatus: PaymentStatus,
    nextStatus: PaymentStatus,
  ): void {
    const flow: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.UNPAID]: [PaymentStatus.PAID, PaymentStatus.FAILED],
      [PaymentStatus.PAID]: [],
      [PaymentStatus.FAILED]: [PaymentStatus.PAID],
      [PaymentStatus.REFUNDED]: [],
    };

    if (!flow[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException({
        message: 'Order payment status transition is invalid',
        details: {
          code: 'ORDER_PAYMENT_STATUS_INVALID',
          current_status: currentStatus,
          next_status: nextStatus,
        },
      });
    }
  }

  private async guardOrderAccess(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    if (user.role === UserRole.USER && order.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You cannot access this order',
        details: { code: 'ORDER_FORBIDDEN' },
      });
    }
    return order;
  }

  private buildIdempotencyNote(note: string | undefined, key: string): string {
    const normalizedNote = note?.trim() ?? '';
    return `${normalizedNote}\n[idempotency:${key}]`.trim();
  }

  private sanitizeOrderNote(note: string | null | undefined): string {
    const normalized = (note ?? '').trim();
    if (!normalized) {
      return '';
    }
    return normalized
      .replace(/\s*\[idempotency:[^\]]+\]\s*/gi, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private async getLatestPaymentMethods(
    orderIds: string[],
  ): Promise<Record<string, PaymentMethod | null>> {
    if (orderIds.length === 0) {
      return {};
    }
    const payments = await this.paymentsRepository.find({
      where: orderIds.map((orderId) => ({ orderId })),
      order: { createdAt: 'DESC' },
    });
    const byOrderId: Record<string, PaymentMethod | null> = {};
    for (const payment of payments) {
      if (byOrderId[payment.orderId] !== undefined) {
        continue;
      }
      byOrderId[payment.orderId] = payment.method;
    }
    return byOrderId;
  }
}
