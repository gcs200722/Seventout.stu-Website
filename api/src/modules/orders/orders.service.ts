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
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderEventOutboxEntity } from './entities/order-event-outbox.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderEventDispatcherService } from './events/order-event-dispatcher.service';
import { OrderQueryService } from './order-query.service';
import { OrderStatusPolicy } from './order-status.policy';
import { ORDER_CART_PORT } from './ports/order-cart.port';
import type { OrderCartPort } from './ports/order-cart.port';
import { ORDER_PRICING_PORT } from './ports/order-pricing.port';
import type { OrderPricingPort } from './ports/order-pricing.port';
import { ORDER_INVENTORY_PORT } from './ports/order-inventory.port';
import type { OrderInventoryPort } from './ports/order-inventory.port';
import { ORDER_FULFILLMENT_PORT } from './ports/order-fulfillment.port';
import type { OrderFulfillmentPort } from './ports/order-fulfillment.port';
import {
  FulfillmentStatus,
  OrderEventType,
  OrderStatus,
  PaymentStatus,
  ShippingAddressSnapshot,
} from './orders.types';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';
import { AuditWriterService } from '../audit/audit-writer.service';

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
    @Inject(ORDER_CART_PORT) private readonly cartPort: OrderCartPort,
    @Inject(ORDER_PRICING_PORT) private readonly pricingPort: OrderPricingPort,
    @Inject(ORDER_INVENTORY_PORT)
    private readonly inventoryPort: OrderInventoryPort,
    @Inject(ORDER_FULFILLMENT_PORT)
    private readonly fulfillmentPort: OrderFulfillmentPort,
    private readonly dataSource: DataSource,
    private readonly eventDispatcher: OrderEventDispatcherService,
    private readonly statusPolicy: OrderStatusPolicy,
    private readonly orderQueryService: OrderQueryService,
    private readonly auditWriter: AuditWriterService,
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
      where: { userId: user.id, idempotencyKey: normalizedKey },
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

      const cartSnapshot = await this.cartPort.getCheckoutCart(
        user.id,
        payload.cart_id,
        manager,
      );
      const priced = await this.pricingPort.priceCheckoutSnapshot(
        user.id,
        payload.cart_id,
        cartSnapshot,
        manager,
      );

      const order = await orderRepo.save(
        orderRepo.create({
          userId: user.id,
          addressId: address.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          totalAmount: priced.total_amount,
          discountTotal: priced.discount_total,
          pricingSnapshot: priced.pricing_snapshot,
          shippingAddress: shippingAddressSnapshot,
          note: this.buildIdempotencyNote(payload.note, normalizedKey),
          idempotencyKey: normalizedKey,
        }),
      );

      const items = priced.items.map((item) =>
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

      await this.pricingPort.finalizeCouponAfterOrder(
        user.id,
        order.id,
        priced,
        manager,
      );

      await outboxRepo.save(
        outboxRepo.create({
          orderId: order.id,
          eventType: OrderEventType.ORDER_CREATED,
          payload: {
            order_id: order.id,
            discount_total: priced.discount_total,
            pricing_snapshot: priced.pricing_snapshot,
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

    await this.auditWriter.log({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.ORDER,
      entityId: createdOrder.id,
      actor: user,
      entityLabel: this.orderAuditLabel(createdOrder),
      metadata: { source: 'http' },
      before: null,
      after: {
        status: createdOrder.status,
        payment_status: createdOrder.paymentStatus,
        total_amount: createdOrder.totalAmount,
        idempotency_key: normalizedKey,
      },
    });

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
    const paymentMethods = await this.orderQueryService.getLatestPaymentMethods(
      items.map((item) => item.id),
    );
    return {
      items: items.map((item) =>
        this.orderQueryService.mapOrderListItem(
          item,
          paymentMethods[item.id] ?? null,
        ),
      ),
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
    const paymentMethods = await this.orderQueryService.getLatestPaymentMethods(
      [orderId],
    );
    return {
      id: order.id,
      status: order.status,
      payment_status: order.paymentStatus,
      payment_method: paymentMethods[orderId] ?? null,
      total_amount: order.totalAmount,
      discount_total: order.discountTotal,
      pricing_snapshot: order.pricingSnapshot,
      note: this.orderQueryService.sanitizeOrderNote(order.note),
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
    const beforeSnapshot = {
      status: order.status,
      payment_status: order.paymentStatus,
    };
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

    await this.auditWriter.log({
      action: AuditAction.CANCEL,
      entityType: AuditEntityType.ORDER,
      entityId: orderId,
      actor: user,
      entityLabel: this.orderAuditLabel(order),
      metadata: { source: 'http' },
      before: beforeSnapshot,
      after: {
        status: order.status,
        payment_status: order.paymentStatus,
      },
    });
  }

  async updateStatus(
    orderId: string,
    payload: UpdateOrderStatusDto,
    actor: AuthenticatedUser,
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
    const beforeSnapshot = {
      status: order.status,
      payment_status: order.paymentStatus,
    };
    this.statusPolicy.ensureValidTransition(order.status, payload.status);
    order.status = payload.status;
    if (payload.status === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
    }
    await this.ordersRepository.save(order);

    await this.auditWriter.log({
      action: AuditAction.STATUS_CHANGE,
      entityType: AuditEntityType.ORDER,
      entityId: orderId,
      actor,
      entityLabel: this.orderAuditLabel(order),
      metadata: { source: 'http' },
      before: beforeSnapshot,
      after: {
        status: order.status,
        payment_status: order.paymentStatus,
      },
    });

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

    this.statusPolicy.ensureValidPaymentTransition(
      order.paymentStatus,
      paymentStatus,
    );
    order.paymentStatus = paymentStatus;
    await this.ordersRepository.save(order);
    if (paymentStatus === PaymentStatus.PAID) {
      await this.fulfillmentPort.onOrderPaymentSucceeded(orderId);
    }

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

  async reserveStock(
    productId: string,
    quantity: number,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryPort.reserveStock(
      productId,
      quantity,
      'Order created: reserve stock',
      orderId,
    );
  }

  async releaseStock(
    productId: string,
    quantity: number,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryPort.releaseStock(
      productId,
      quantity,
      'Order canceled: release stock',
      orderId,
    );
  }

  async completeStockOut(
    productId: string,
    quantity: number,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryPort.commitStockOut(
      productId,
      quantity,
      'Order completed: commit stock out',
      orderId,
    );
  }

  private orderAuditLabel(
    order: Pick<OrderEntity, 'id' | 'totalAmount'>,
  ): string {
    const money = `${order.totalAmount.toLocaleString('vi-VN')} ₫`;
    return `Đơn hàng ${money} · #${order.id.slice(0, 8)}`;
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
}
