import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { OrderEventOutboxEntity } from '../orders/entities/order-event-outbox.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import {
  FulfillmentStatus as OrderFulfillmentStatus,
  OrderStatus,
} from '../orders/orders.types';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { PaymentMethod, PaymentStatus } from '../payments/payments.types';
import {
  FailedDeliveryAction,
  HandleFailedDeliveryDto,
} from './dto/handle-failed-delivery.dto';
import { FulfillmentEntity } from './entities/fulfillment.entity';
import { FulfillmentService } from './fulfillment.service';
import { FulfillmentShippingStatus } from './fulfillment.types';

describe('FulfillmentService', () => {
  let service: FulfillmentService;
  let fulfillmentRepository: jest.Mocked<Repository<FulfillmentEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let paymentsRepository: jest.Mocked<Repository<PaymentEntity>>;
  let orderItemsRepository: jest.Mocked<Repository<OrderItemEntity>>;
  let outboxRepository: jest.Mocked<Repository<OrderEventOutboxEntity>>;
  let dataSource: jest.Mocked<DataSource>;

  const user: AuthenticatedUser = {
    id: 'u-1',
    email: 'u@example.com',
    role: UserRole.USER,
    permissions: [],
  };

  beforeEach(() => {
    fulfillmentRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((payload) => payload as FulfillmentEntity),
    } as never;
    ordersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as never;
    paymentsRepository = {
      findOne: jest.fn(),
    } as never;
    orderItemsRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as never;
    outboxRepository = {
      create: jest.fn((payload: unknown) => payload as OrderEventOutboxEntity),
    } as never;
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          (
            cb: (manager: {
              save: jest.Mock;
              create: (
                entity: unknown,
                payload: Record<string, unknown>,
              ) => Record<string, unknown>;
            }) => Promise<unknown>,
          ) =>
            cb({
              save: jest
                .fn()
                .mockImplementation((entity: Record<string, unknown>) =>
                  Promise.resolve(entity),
                ),
              create: (_entity: unknown, payload: Record<string, unknown>) =>
                payload,
            }),
        ),
    } as never;

    service = new FulfillmentService(
      fulfillmentRepository,
      ordersRepository,
      paymentsRepository,
      orderItemsRepository,
      outboxRepository,
      dataSource,
    );
  });

  it('creates fulfillment for COD flow', async () => {
    ordersRepository.findOne.mockResolvedValue({ id: 'o-1' } as OrderEntity);
    fulfillmentRepository.findOne.mockResolvedValue(null);
    paymentsRepository.findOne.mockResolvedValue({
      method: PaymentMethod.COD,
    } as PaymentEntity);
    fulfillmentRepository.save.mockResolvedValue({
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.PENDING,
    } as FulfillmentEntity);

    const result = await service.createFulfillment({
      order_id: 'o-1',
      shipping_provider: 'GHN',
    });

    expect(result.id).toBe('f-1');
  });

  it('rejects create when online payment is not successful', async () => {
    ordersRepository.findOne.mockResolvedValue({ id: 'o-1' } as OrderEntity);
    fulfillmentRepository.findOne.mockResolvedValue(null);
    paymentsRepository.findOne.mockResolvedValue({
      method: PaymentMethod.VNPAY,
      status: PaymentStatus.PENDING,
    } as PaymentEntity);

    await expect(
      service.createFulfillment({ order_id: 'o-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects user reading fulfillment from another owner', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: 'u-2',
    } as OrderEntity);

    await expect(service.getByOrderId(user, 'o-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects invalid status transitions', async () => {
    fulfillmentRepository.findOne.mockResolvedValue({
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.PENDING,
    } as FulfillmentEntity);

    await expect(
      service.updateStatus('f-1', {
        status: FulfillmentShippingStatus.SHIPPED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects tracking code update when next status is not shipped', async () => {
    fulfillmentRepository.findOne.mockResolvedValue({
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.SHIPPED,
      trackingCode: 'TRACK-OLD',
    } as FulfillmentEntity);

    await expect(
      service.updateStatus('f-1', {
        status: FulfillmentShippingStatus.DELIVERED,
        tracking_code: 'TRACK-NEW',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets deliveredAt when delivered', async () => {
    const base = {
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.SHIPPED,
      trackingCode: 'TRACK-1',
      shippingProvider: 'GHN',
      note: '',
      shippedAt: new Date(),
      deliveredAt: null,
    } as FulfillmentEntity;
    fulfillmentRepository.findOne.mockResolvedValue(base);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.SHIPPED,
      fulfillmentStatus: OrderFulfillmentStatus.SHIPPED,
    } as unknown as OrderEntity);
    ordersRepository.save.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.COMPLETED,
      fulfillmentStatus: OrderFulfillmentStatus.DELIVERED,
    } as unknown as OrderEntity);
    fulfillmentRepository.save.mockResolvedValue({
      ...base,
      status: FulfillmentShippingStatus.DELIVERED,
      deliveredAt: new Date(),
    } as FulfillmentEntity);

    const result = await service.updateStatus('f-1', {
      status: FulfillmentShippingStatus.DELIVERED,
    });

    expect(result.status).toBe(FulfillmentShippingStatus.DELIVERED);
    expect(result.deliveredAt).toBeTruthy();
  });

  it('sets deliveredAt when failed delivery', async () => {
    const base = {
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.SHIPPED,
      trackingCode: 'TRACK-1',
      shippingProvider: 'GHN',
      note: '',
      shippedAt: new Date(),
      deliveredAt: null,
    } as FulfillmentEntity;
    fulfillmentRepository.findOne.mockResolvedValue(base);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.SHIPPED,
      fulfillmentStatus: OrderFulfillmentStatus.SHIPPED,
    } as unknown as OrderEntity);
    ordersRepository.save.mockResolvedValue({} as OrderEntity);
    fulfillmentRepository.save.mockResolvedValue({
      ...base,
      status: FulfillmentShippingStatus.FAILED_DELIVERY,
      deliveredAt: new Date(),
    } as FulfillmentEntity);

    const result = await service.updateStatus('f-1', {
      status: FulfillmentShippingStatus.FAILED_DELIVERY,
    });

    expect(result.status).toBe(FulfillmentShippingStatus.FAILED_DELIVERY);
    expect(result.deliveredAt).toBeTruthy();
  });

  it('throws not found for missing order', async () => {
    ordersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createFulfillment({ order_id: 'o-404' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('syncs order status to shipped when fulfillment shipped', async () => {
    const base = {
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.PACKING,
      trackingCode: null,
      shippingProvider: 'GHN',
      note: '',
      shippedAt: null,
      deliveredAt: null,
    } as FulfillmentEntity;
    fulfillmentRepository.findOne.mockResolvedValue(base);
    fulfillmentRepository.save.mockResolvedValue({
      ...base,
      status: FulfillmentShippingStatus.SHIPPED,
      trackingCode: 'TRACK-99',
      shippedAt: new Date(),
    } as FulfillmentEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.PROCESSING,
      fulfillmentStatus: OrderFulfillmentStatus.PROCESSING,
      completedAt: null,
    } as unknown as OrderEntity);
    ordersRepository.save.mockResolvedValue({} as OrderEntity);

    await service.updateStatus('f-1', {
      status: FulfillmentShippingStatus.SHIPPED,
      tracking_code: 'TRACK-99',
    });

    expect((ordersRepository.save as jest.Mock).mock.calls.length).toBe(1);
  });

  it('rejects sync when mapped order transition is invalid', async () => {
    const base = {
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.PACKING,
      trackingCode: 'TRACK-99',
      shippingProvider: 'GHN',
      note: '',
      shippedAt: null,
      deliveredAt: null,
    } as FulfillmentEntity;
    fulfillmentRepository.findOne.mockResolvedValue(base);
    fulfillmentRepository.save.mockResolvedValue({
      ...base,
      status: FulfillmentShippingStatus.SHIPPED,
      shippedAt: new Date(),
    } as FulfillmentEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.CANCELED,
      fulfillmentStatus: OrderFulfillmentStatus.FAILED,
    } as unknown as OrderEntity);

    await expect(
      service.updateStatus('f-1', {
        status: FulfillmentShippingStatus.SHIPPED,
        tracking_code: 'TRACK-99',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('handles retry delivery action from failed delivery', async () => {
    fulfillmentRepository.findOne.mockResolvedValue({
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.FAILED_DELIVERY,
      trackingCode: 'TRACK-RETRY-1',
      note: 'First attempt failed',
      deliveredAt: null,
    } as FulfillmentEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.PROCESSING,
      fulfillmentStatus: OrderFulfillmentStatus.FAILED,
    } as unknown as OrderEntity);
    fulfillmentRepository.save.mockResolvedValue({
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.SHIPPED,
      note: 'updated',
    } as FulfillmentEntity);
    ordersRepository.save.mockResolvedValue({} as OrderEntity);

    const payload: HandleFailedDeliveryDto = {
      action: FailedDeliveryAction.RETRY_DELIVERY,
      note: 'Retry with daytime slot',
    };
    const result = await service.handleFailedDeliveryAction('f-1', payload);

    expect(result.status).toBe(FulfillmentShippingStatus.SHIPPED);
    expect((ordersRepository.save as jest.Mock).mock.calls.length).toBe(1);
  });

  it('handles return to warehouse action and cancels order', async () => {
    fulfillmentRepository.findOne.mockResolvedValue({
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.FAILED_DELIVERY,
      note: '',
    } as FulfillmentEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.SHIPPED,
      fulfillmentStatus: OrderFulfillmentStatus.SHIPPED,
      canceledAt: null,
    } as unknown as OrderEntity);

    const payload: HandleFailedDeliveryDto = {
      action: FailedDeliveryAction.RETURN_TO_WAREHOUSE,
    };
    const result = await service.handleFailedDeliveryAction('f-1', payload);

    expect(result.status).toBe(FulfillmentShippingStatus.CANCELLED);
    expect((dataSource.transaction as jest.Mock).mock.calls.length).toBe(1);
  });

  it('rejects retry delivery action when tracking code is missing', async () => {
    fulfillmentRepository.findOne.mockResolvedValue({
      id: 'f-1',
      orderId: 'o-1',
      status: FulfillmentShippingStatus.FAILED_DELIVERY,
      trackingCode: null,
      note: '',
    } as FulfillmentEntity);

    await expect(
      service.handleFailedDeliveryAction('f-1', {
        action: FailedDeliveryAction.RETRY_DELIVERY,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
