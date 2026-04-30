import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { AuditAction, AuditEntityType } from '../../core/audit/audit.constants';
import { AuditWriterService } from '../../core/audit/audit-writer.service';
import { NotificationService } from '../../core/notification/notification.service';
import { OrderEventOutboxEntity } from '../orders/entities/order-event-outbox.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import {
  FulfillmentStatus as OrderFulfillmentStatus,
  OrderEventType,
  OrderStatus,
} from '../orders/orders.types';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { PaymentMethod, PaymentStatus } from '../payments/payments.types';
import { CreateFulfillmentDto } from './dto/create-fulfillment.dto';
import {
  FailedDeliveryAction,
  HandleFailedDeliveryDto,
} from './dto/handle-failed-delivery.dto';
import { UpdateFulfillmentStatusDto } from './dto/update-fulfillment-status.dto';
import { FulfillmentEntity } from './entities/fulfillment.entity';
import {
  FULFILLMENT_STATUS_FLOW,
  FulfillmentShippingStatus,
} from './fulfillment.types';

const FULFILLMENT_TO_ORDER_STATUS_MAP: Partial<
  Record<FulfillmentShippingStatus, OrderStatus>
> = {
  [FulfillmentShippingStatus.CONFIRMED]: OrderStatus.PROCESSING,
  [FulfillmentShippingStatus.PACKING]: OrderStatus.PROCESSING,
  [FulfillmentShippingStatus.SHIPPED]: OrderStatus.SHIPPED,
  [FulfillmentShippingStatus.DELIVERED]: OrderStatus.COMPLETED,
};

const FULFILLMENT_TO_ORDER_FULFILLMENT_STATUS_MAP: Record<
  FulfillmentShippingStatus,
  OrderFulfillmentStatus
> = {
  [FulfillmentShippingStatus.PENDING]: OrderFulfillmentStatus.UNFULFILLED,
  [FulfillmentShippingStatus.CONFIRMED]: OrderFulfillmentStatus.PROCESSING,
  [FulfillmentShippingStatus.PACKING]: OrderFulfillmentStatus.PROCESSING,
  [FulfillmentShippingStatus.SHIPPED]: OrderFulfillmentStatus.SHIPPED,
  [FulfillmentShippingStatus.DELIVERED]: OrderFulfillmentStatus.DELIVERED,
  [FulfillmentShippingStatus.CANCELLED]: OrderFulfillmentStatus.FAILED,
  [FulfillmentShippingStatus.FAILED_DELIVERY]: OrderFulfillmentStatus.FAILED,
};

const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELED]: [],
};

@Injectable()
export class FulfillmentService {
  private defaultTenantId: string | null = null;
  constructor(
    @InjectRepository(FulfillmentEntity)
    private readonly fulfillmentRepository: Repository<FulfillmentEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemsRepository: Repository<OrderItemEntity>,
    @InjectRepository(OrderEventOutboxEntity)
    private readonly outboxRepository: Repository<OrderEventOutboxEntity>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async createFulfillment(
    payload: CreateFulfillmentDto,
  ): Promise<FulfillmentEntity> {
    const tenantId = await this.resolveTenantId();
    const order = await this.ordersRepository.findOne({
      where: { id: payload.order_id, tenantId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }

    const existing = await this.fulfillmentRepository.findOne({
      where: { tenantId, orderId: payload.order_id },
    });
    if (existing) {
      throw new BadRequestException({
        message: 'Fulfillment already exists for this order',
        details: { code: 'FULFILLMENT_ALREADY_EXISTS' },
      });
    }

    const latestPayment = await this.paymentsRepository.findOne({
      where: { tenantId, orderId: payload.order_id },
      order: { createdAt: 'DESC' },
    });
    const isCodFlow =
      latestPayment?.method === PaymentMethod.COD || latestPayment == null;
    const isOnlineReady =
      latestPayment != null &&
      latestPayment.method !== PaymentMethod.COD &&
      latestPayment.status === PaymentStatus.SUCCESS;
    if (!isCodFlow && !isOnlineReady) {
      throw new BadRequestException({
        message: 'Payment is not ready for fulfillment creation',
        details: { code: 'PAYMENT_NOT_READY_FOR_FULFILLMENT' },
      });
    }

    return this.fulfillmentRepository.save(
      this.fulfillmentRepository.create({
        orderId: payload.order_id,
        tenantId,
        status: FulfillmentShippingStatus.PENDING,
        shippingProvider: payload.shipping_provider?.trim() || null,
        note: payload.note?.trim() || '',
      }),
    );
  }

  async getByOrderId(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<FulfillmentEntity> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, tenantId: await this.resolveTenantId() },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    if (user.role === UserRole.USER && order.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You cannot access this fulfillment',
        details: { code: 'FULFILLMENT_FORBIDDEN' },
      });
    }

    const fulfillment = await this.fulfillmentRepository.findOne({
      where: { tenantId: await this.resolveTenantId(), orderId },
    });
    if (!fulfillment) {
      throw new NotFoundException({
        message: 'Fulfillment not found',
        details: { code: 'FULFILLMENT_NOT_FOUND' },
      });
    }

    return fulfillment;
  }

  async updateStatus(
    fulfillmentId: string,
    payload: UpdateFulfillmentStatusDto,
  ): Promise<FulfillmentEntity> {
    const fulfillment = await this.fulfillmentRepository.findOne({
      where: { id: fulfillmentId, tenantId: await this.resolveTenantId() },
    });
    if (!fulfillment) {
      throw new NotFoundException({
        message: 'Fulfillment not found',
        details: { code: 'FULFILLMENT_NOT_FOUND' },
      });
    }

    this.ensureValidTransition(fulfillment.status, payload.status);
    if (
      payload.status === FulfillmentShippingStatus.SHIPPED &&
      !payload.tracking_code?.trim() &&
      !fulfillment.trackingCode
    ) {
      throw new BadRequestException({
        message: 'Tracking code is required before shipment',
        details: { code: 'TRACKING_CODE_REQUIRED' },
      });
    }
    if (
      payload.status === FulfillmentShippingStatus.DELIVERED &&
      fulfillment.status !== FulfillmentShippingStatus.SHIPPED
    ) {
      throw new BadRequestException({
        message: 'Cannot mark delivered before shipped',
        details: { code: 'FULFILLMENT_STATUS_INVALID' },
      });
    }
    if (
      payload.tracking_code?.trim() &&
      payload.status !== FulfillmentShippingStatus.SHIPPED
    ) {
      throw new BadRequestException({
        message: 'Tracking code can only be updated when status is SHIPPED',
        details: { code: 'TRACKING_CODE_STATUS_INVALID' },
      });
    }

    fulfillment.status = payload.status;
    if (payload.tracking_code?.trim()) {
      fulfillment.trackingCode = payload.tracking_code.trim();
    }
    if (payload.shipping_provider?.trim()) {
      fulfillment.shippingProvider = payload.shipping_provider.trim();
    }
    if (payload.note !== undefined) {
      fulfillment.note = payload.note.trim();
    }
    if (payload.status === FulfillmentShippingStatus.SHIPPED) {
      fulfillment.shippedAt = fulfillment.shippedAt ?? new Date();
    }
    if (
      payload.status === FulfillmentShippingStatus.DELIVERED ||
      payload.status === FulfillmentShippingStatus.FAILED_DELIVERY
    ) {
      fulfillment.deliveredAt = new Date();
    }

    const savedFulfillment = await this.fulfillmentRepository.save(fulfillment);
    await this.syncOrderStatusFromFulfillment(savedFulfillment);
    if (payload.status === FulfillmentShippingStatus.SHIPPED) {
      await this.notificationService.notifyFulfillmentStatus(
        savedFulfillment.orderId,
        'SHIPPED',
        `fulfillment:${savedFulfillment.id}:shipped`,
      );
    }
    if (payload.status === FulfillmentShippingStatus.DELIVERED) {
      await this.notificationService.notifyFulfillmentStatus(
        savedFulfillment.orderId,
        'DELIVERED',
        `fulfillment:${savedFulfillment.id}:delivered`,
      );
    }
    return savedFulfillment;
  }

  async createForOrderLifecycle(
    orderId: string,
    shippingProvider?: string,
  ): Promise<void> {
    const existing = await this.fulfillmentRepository.findOne({
      where: { tenantId: await this.resolveTenantId(), orderId },
    });
    if (existing) {
      return;
    }
    await this.createFulfillment({
      order_id: orderId,
      shipping_provider: shippingProvider,
    });
  }

  async cancelByOrderId(orderId: string): Promise<void> {
    const fulfillment = await this.fulfillmentRepository.findOne({
      where: { tenantId: await this.resolveTenantId(), orderId },
    });
    if (!fulfillment) {
      return;
    }
    if (
      fulfillment.status === FulfillmentShippingStatus.DELIVERED ||
      fulfillment.status === FulfillmentShippingStatus.CANCELLED
    ) {
      return;
    }
    fulfillment.status = FulfillmentShippingStatus.CANCELLED;
    await this.fulfillmentRepository.save(fulfillment);
  }

  async handleFailedDeliveryAction(
    fulfillmentId: string,
    payload: HandleFailedDeliveryDto,
  ): Promise<FulfillmentEntity> {
    const fulfillment = await this.fulfillmentRepository.findOne({
      where: { id: fulfillmentId, tenantId: await this.resolveTenantId() },
    });
    if (!fulfillment) {
      throw new NotFoundException({
        message: 'Fulfillment not found',
        details: { code: 'FULFILLMENT_NOT_FOUND' },
      });
    }
    if (fulfillment.status !== FulfillmentShippingStatus.FAILED_DELIVERY) {
      throw new BadRequestException({
        message:
          'Failed delivery action is only allowed in FAILED_DELIVERY status',
        details: { code: 'FAILED_DELIVERY_ACTION_INVALID' },
      });
    }

    if (payload.action === FailedDeliveryAction.RETRY_DELIVERY) {
      if (!fulfillment.trackingCode?.trim()) {
        throw new BadRequestException({
          message: 'Tracking code is required before retry delivery',
          details: { code: 'TRACKING_CODE_REQUIRED' },
        });
      }
      fulfillment.status = FulfillmentShippingStatus.SHIPPED;
      fulfillment.deliveredAt = null;
      fulfillment.note = this.appendActionNote(
        fulfillment.note,
        payload.note,
        'Retry delivery requested',
      );
      const savedFulfillment =
        await this.fulfillmentRepository.save(fulfillment);
      await this.syncOrderStatusFromFulfillment(savedFulfillment);
      return savedFulfillment;
    }

    const order = await this.ordersRepository.findOne({
      where: {
        id: fulfillment.orderId,
        tenantId: await this.resolveTenantId(),
      },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException({
        message: 'Cannot cancel completed order from failed delivery action',
        details: { code: 'ORDER_STATUS_INVALID' },
      });
    }

    const beforeOrderCancel = {
      status: order.status,
      payment_status: order.paymentStatus,
    };

    fulfillment.status = FulfillmentShippingStatus.CANCELLED;
    fulfillment.note = this.appendActionNote(
      fulfillment.note,
      payload.note,
      payload.action === FailedDeliveryAction.CANCEL_ORDER
        ? 'Order canceled after failed delivery'
        : 'Returned to warehouse after failed delivery',
    );

    order.status = OrderStatus.CANCELED;
    order.canceledAt = order.canceledAt ?? new Date();
    order.fulfillmentStatus = OrderFulfillmentStatus.FAILED;
    const orderItems = await this.orderItemsRepository.find({
      where: { orderId: order.id },
    });

    const savedFulfillment = await this.dataSource.transaction(
      async (manager) => {
        const savedFf = await manager.save(fulfillment);
        await manager.save(order);
        await manager.save(
          manager.create(OrderEventOutboxEntity, {
            orderId: order.id,
            tenantId: await this.resolveTenantId(),
            eventType: OrderEventType.ORDER_CANCELED,
            payload: {
              tenant_id: await this.resolveTenantId(),
              order_id: order.id,
              items: orderItems.map((item) => ({
                product_id: item.productId,
                quantity: item.quantity,
              })),
            },
          }),
        );
        return savedFf;
      },
    );

    await this.auditWriter.log({
      action: AuditAction.CANCEL,
      entityType: AuditEntityType.ORDER,
      entityId: order.id,
      actor: null,
      entityLabel: this.orderAuditLabel(order),
      metadata: {
        source: 'system',
        trigger: 'fulfillment_failed_delivery',
        fulfillment_id: fulfillment.id,
      },
      before: beforeOrderCancel,
      after: {
        status: order.status,
        payment_status: order.paymentStatus,
      },
    });

    return savedFulfillment;
  }

  private ensureValidTransition(
    currentStatus: FulfillmentShippingStatus,
    nextStatus: FulfillmentShippingStatus,
  ): void {
    if (!FULFILLMENT_STATUS_FLOW[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException({
        message: 'Cannot update fulfillment status',
        details: {
          code: 'INVALID_FULFILLMENT',
          current_status: currentStatus,
          next_status: nextStatus,
        },
      });
    }
  }

  private async syncOrderStatusFromFulfillment(
    fulfillment: FulfillmentEntity,
  ): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: {
        id: fulfillment.orderId,
        tenantId: await this.resolveTenantId(),
      },
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
      fulfillment_status: order.fulfillmentStatus,
    };

    order.fulfillmentStatus =
      FULFILLMENT_TO_ORDER_FULFILLMENT_STATUS_MAP[fulfillment.status];
    const mappedOrderStatus =
      FULFILLMENT_TO_ORDER_STATUS_MAP[fulfillment.status];
    if (mappedOrderStatus) {
      order.status = this.getReachableSyncedOrderStatus(
        order.status,
        mappedOrderStatus,
      );
      if (mappedOrderStatus === OrderStatus.COMPLETED) {
        order.completedAt = order.completedAt ?? new Date();
      }
    }

    await this.ordersRepository.save(order);

    const afterSnapshot = {
      status: order.status,
      payment_status: order.paymentStatus,
      fulfillment_status: order.fulfillmentStatus,
    };

    if (JSON.stringify(beforeSnapshot) === JSON.stringify(afterSnapshot)) {
      return;
    }

    const orderStatusChanged = beforeSnapshot.status !== afterSnapshot.status;
    await this.auditWriter.log({
      action: orderStatusChanged
        ? AuditAction.STATUS_CHANGE
        : AuditAction.UPDATE,
      entityType: AuditEntityType.ORDER,
      entityId: order.id,
      actor: null,
      entityLabel: this.orderAuditLabel(order),
      metadata: {
        source: 'system',
        trigger: 'fulfillment_sync',
        fulfillment_id: fulfillment.id,
        fulfillment_shipping_status: fulfillment.status,
      },
      before: beforeSnapshot,
      after: afterSnapshot,
    });
  }

  private orderAuditLabel(
    order: Pick<OrderEntity, 'id' | 'totalAmount'>,
  ): string {
    const total = order.totalAmount ?? 0;
    const money = `${Number(total).toLocaleString('vi-VN')} ₫`;
    return `Đơn hàng ${money} · #${order.id.slice(0, 8)}`;
  }

  private ensureValidOrderTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): void {
    if (currentStatus === nextStatus) {
      return;
    }
    if (!ORDER_STATUS_FLOW[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException({
        message: 'Cannot sync order status from fulfillment transition',
        details: {
          code: 'ORDER_STATUS_SYNC_INVALID',
          current_status: currentStatus,
          next_status: nextStatus,
        },
      });
    }
  }

  private getReachableSyncedOrderStatus(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
  ): OrderStatus {
    if (currentStatus === targetStatus) {
      return targetStatus;
    }
    if (
      currentStatus === OrderStatus.CANCELED ||
      currentStatus === OrderStatus.COMPLETED
    ) {
      this.ensureValidOrderTransition(currentStatus, targetStatus);
      return targetStatus;
    }

    const orderSequence: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.COMPLETED,
    ];
    const currentIndex = orderSequence.indexOf(currentStatus);
    const targetIndex = orderSequence.indexOf(targetStatus);
    if (
      currentIndex === -1 ||
      targetIndex === -1 ||
      targetIndex < currentIndex
    ) {
      this.ensureValidOrderTransition(currentStatus, targetStatus);
      return targetStatus;
    }
    return orderSequence[targetIndex];
  }

  private appendActionNote(
    currentNote: string | null | undefined,
    additionalNote: string | undefined,
    actionLabel: string,
  ): string {
    const chunks = [currentNote?.trim(), `[Action] ${actionLabel}`];
    if (additionalNote?.trim()) {
      chunks.push(additionalNote.trim());
    }
    return chunks.filter(Boolean).join('\n');
  }

  private async resolveTenantId(): Promise<string> {
    if (this.defaultTenantId) {
      return this.defaultTenantId;
    }
    const configured = this.configService.get<string>('DEFAULT_TENANT_ID');
    if (configured?.trim()) {
      this.defaultTenantId = configured.trim();
      return this.defaultTenantId;
    }
    const fallbackSlug = this.configService.get<string>(
      'DEFAULT_TENANT_SLUG',
      'default',
    );
    const rows: unknown = await this.dataSource.query(
      `SELECT id FROM tenants WHERE LOWER(slug) = LOWER($1) LIMIT 1`,
      [fallbackSlug],
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const firstRow: unknown = rows[0];
      if (
        firstRow &&
        typeof firstRow === 'object' &&
        'id' in firstRow &&
        typeof firstRow.id === 'string'
      ) {
        this.defaultTenantId = firstRow.id;
        return this.defaultTenantId;
      }
    }
    throw new BadRequestException('Default tenant is not configured.');
  }
}
