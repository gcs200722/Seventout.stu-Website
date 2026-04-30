/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AddressEntity } from '../../core/address/entities/address.entity';
import { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { OrderEventOutboxEntity } from './entities/order-event-outbox.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderEventDispatcherService } from './events/order-event-dispatcher.service';
import { OrderQueryService } from './order-query.service';
import { OrderStatusPolicy } from './order-status.policy';
import { OrderCartPort } from './ports/order-cart.port';
import { OrderPricingPort } from './ports/order-pricing.port';
import { OrderFulfillmentPort } from './ports/order-fulfillment.port';
import { OrderInventoryPort } from './ports/order-inventory.port';
import type { AuditWriterService } from '../../core/audit/audit-writer.service';
import type { TenantContextService } from '../../core/context/tenant-context.service';

const TENANT_ID = 'tenant-test-1';
import { OrdersService } from './orders.service';
import { OrderEventType, OrderStatus, PaymentStatus } from './orders.types';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let orderItemsRepository: jest.Mocked<Repository<OrderItemEntity>>;
  let outboxRepository: jest.Mocked<Repository<OrderEventOutboxEntity>>;
  let cartPort: jest.Mocked<OrderCartPort>;
  let pricingPort: jest.Mocked<OrderPricingPort>;
  let inventoryPort: jest.Mocked<OrderInventoryPort>;
  let fulfillmentPort: jest.Mocked<OrderFulfillmentPort>;
  let addressesRepository: jest.Mocked<Repository<AddressEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let eventDispatcher: jest.Mocked<OrderEventDispatcherService>;
  let statusPolicy: jest.Mocked<OrderStatusPolicy>;
  let orderQueryService: jest.Mocked<OrderQueryService>;
  let auditWriter: jest.Mocked<Pick<AuditWriterService, 'log'>>;
  let tenantContext: jest.Mocked<
    Pick<TenantContextService, 'requireTenantIdOrDefault'>
  >;

  const user: AuthenticatedUser = {
    id: 'u-1',
    email: 'u@example.com',
    role: UserRole.USER,
    permissions: [],
  };

  beforeEach(() => {
    ordersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((p: unknown) => p as OrderEntity),
      createQueryBuilder: jest.fn(),
    } as never;
    orderItemsRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((p: unknown) => p as OrderItemEntity),
    } as never;
    outboxRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((p: unknown) => p as OrderEventOutboxEntity),
    } as never;
    cartPort = {
      getCheckoutCart: jest.fn(),
      clearCartAfterCheckout: jest.fn(),
    };
    pricingPort = {
      priceCheckoutSnapshot: jest.fn(),
      finalizeCouponAfterOrder: jest.fn(),
    };
    inventoryPort = {
      reserveStock: jest.fn(),
      releaseStock: jest.fn(),
      commitStockOut: jest.fn(),
    };
    fulfillmentPort = {
      onOrderCreated: jest.fn(),
      onOrderPaymentSucceeded: jest.fn(),
      onOrderCanceled: jest.fn(),
      onOrderCompleted: jest.fn(),
    };
    addressesRepository = {
      findOne: jest.fn(),
    } as never;
    dataSource = { transaction: jest.fn() } as never;
    eventDispatcher = { dispatch: jest.fn() } as never;
    statusPolicy = {
      ensureValidTransition: jest.fn(),
      ensureValidPaymentTransition: jest.fn(),
    } as never;
    orderQueryService = {
      getLatestPaymentMethods: jest.fn().mockResolvedValue({}),
      mapOrderListItem: jest.fn((item) => item as never),
      sanitizeOrderNote: jest.fn((note) => (note ?? '') as never),
    } as never;

    auditWriter = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    tenantContext = {
      requireTenantIdOrDefault: jest.fn().mockResolvedValue(TENANT_ID),
    };

    const configService = {
      get: jest.fn((key: string) =>
        key === 'DEFAULT_TENANT_ID' ? TENANT_ID : undefined,
      ),
    };

    service = new OrdersService(
      ordersRepository,
      orderItemsRepository,
      outboxRepository,
      addressesRepository,
      cartPort,
      pricingPort,
      inventoryPort,
      fulfillmentPort,
      configService as never,
      dataSource,
      eventDispatcher,
      statusPolicy,
      orderQueryService,
      auditWriter as unknown as AuditWriterService,
      tenantContext as never,
    );
  });

  it('creates order and returns envelope', async () => {
    ordersRepository.findOne.mockResolvedValue(null);
    cartPort.getCheckoutCart.mockResolvedValue({
      cart_id: 'c-1',
      applied_coupon_id: null,
      subtotal_amount: 1000,
      total_amount: 1000,
      items: [
        {
          product_id: 'p-1',
          product_variant_id: 'v-1',
          variant_color: 'Đen',
          variant_size: 'M',
          product_name: 'Hoodie',
          price: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
    });
    pricingPort.priceCheckoutSnapshot.mockResolvedValue({
      cart_id: 'c-1',
      applied_coupon_id: null,
      subtotal_amount: 1000,
      total_amount: 1000,
      items: [
        {
          product_id: 'p-1',
          product_variant_id: 'v-1',
          variant_color: 'Đen',
          variant_size: 'M',
          product_name: 'Hoodie',
          price: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
      discount_total: 0,
      pricing_snapshot: {
        subtotal_amount: 1000,
        discount_total: 0,
        total_amount: 1000,
        stack_mode: 'BEST_OF',
      },
      record_coupon_usage: false,
      winning_coupon_code: null,
      coupon_discount_applied: 0,
    });
    addressesRepository.findOne.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      fullName: 'Nguyen Van A',
      phone: '0909123456',
      addressLine: '123 ABC Street',
      ward: 'Ward 5',
      district: 'District 1',
      city: 'Ho Chi Minh',
      country: 'Vietnam',
    } as AddressEntity);
    (dataSource.transaction as jest.Mock).mockImplementation(
      (cb: (manager: Record<string, unknown>) => Promise<unknown>) =>
        Promise.resolve(
          cb({
            getRepository: (entity: unknown) => {
              if (entity === OrderEntity) {
                return {
                  create: (p: unknown) => p,
                  save: jest.fn().mockResolvedValue({
                    id: 'o-1',
                    status: OrderStatus.PENDING,
                    paymentStatus: PaymentStatus.UNPAID,
                    totalAmount: 1000,
                  }),
                };
              }
              if (entity === OrderItemEntity) {
                return {
                  create: (p: unknown) => p,
                  save: jest.fn().mockResolvedValue(undefined),
                };
              }
              return {
                create: (p: unknown) => p,
                save: jest.fn().mockResolvedValue(undefined),
              };
            },
          }),
        ),
    );
    const result = await service.createOrder(
      user,
      {
        cart_id: 'c-1',
        address_id: 'a-1',
        note: 'ok',
      },
      'idmp-1',
    );

    expect(result.order_id).toBe('o-1');
    expect(
      (cartPort.clearCartAfterCheckout as jest.Mock).mock.calls[0],
    ).toEqual(['u-1', 'c-1']);
  });

  it('returns duplicated order on same idempotency key', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      totalAmount: 1000,
      idempotencyKey: 'idmp-1',
    } as OrderEntity);

    const result = await service.createOrder(
      user,
      {
        cart_id: 'c-1',
        address_id: 'a-1',
      },
      'idmp-1',
    );
    expect(result.order_id).toBe('o-1');
    expect((cartPort.getCheckoutCart as jest.Mock).mock.calls.length).toBe(0);
  });

  it('throws not found when address does not exist', async () => {
    ordersRepository.findOne.mockResolvedValue(null);
    cartPort.getCheckoutCart.mockResolvedValue({
      cart_id: 'c-1',
      applied_coupon_id: null,
      subtotal_amount: 1000,
      total_amount: 1000,
      items: [],
    });
    addressesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createOrder(
        user,
        {
          cart_id: 'c-1',
          address_id: 'missing-address',
        },
        'idmp-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects cancel on invalid status', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: 'u-1',
      status: OrderStatus.PROCESSING,
    } as OrderEntity);
    await expect(service.cancelOrder(user, 'o-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects user reading another user order', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: 'u-2',
    } as OrderEntity);
    await expect(service.getOrderById(user, 'o-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws not found on missing order', async () => {
    ordersRepository.findOne.mockResolvedValue(null);
    await expect(service.getOrderById(user, 'o-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects invalid status transition', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      status: OrderStatus.PENDING,
    } as OrderEntity);
    statusPolicy.ensureValidTransition.mockImplementation(() => {
      throw new BadRequestException();
    });
    const staff: AuthenticatedUser = {
      id: 'staff-1',
      email: 's@e.com',
      role: UserRole.STAFF,
      permissions: [],
    };
    await expect(
      service.updateStatus('o-1', { status: OrderStatus.SHIPPED }, staff),
    ).rejects.toThrow(BadRequestException);

    const ensureValidTransitionMock =
      statusPolicy.ensureValidTransition as jest.Mock;
    expect(ensureValidTransitionMock.mock.calls[0]).toEqual([
      OrderStatus.PENDING,
      OrderStatus.SHIPPED,
    ]);
  });

  it('processes outbox with success and marks processed', async () => {
    outboxRepository.find.mockResolvedValue([
      {
        id: 'e-1',
        orderId: 'o-1',
        eventType: OrderEventType.ORDER_CREATED,
        payload: { order_id: 'o-1', items: [] },
        processedAt: null,
        failedAt: null,
        errorMessage: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OrderEventOutboxEntity,
    ]);
    eventDispatcher.dispatch.mockResolvedValue(undefined);
    outboxRepository.save.mockResolvedValue({} as never);

    await service.processOutbox();
    expect((eventDispatcher.dispatch as jest.Mock).mock.calls.length).toBe(1);
    expect((outboxRepository.save as jest.Mock).mock.calls.length).toBe(1);
  });

  it('triggers fulfillment hook when payment becomes paid', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      paymentStatus: PaymentStatus.UNPAID,
    } as OrderEntity);
    ordersRepository.save.mockResolvedValue({
      id: 'o-1',
      paymentStatus: PaymentStatus.PAID,
    } as OrderEntity);

    const result = await service.markOrderPaymentStatus(
      'o-1',
      PaymentStatus.PAID,
    );

    expect(result.payment_status).toBe(PaymentStatus.PAID);
    expect(
      (fulfillmentPort.onOrderPaymentSucceeded as jest.Mock).mock.calls[0],
    ).toEqual(['o-1']);
  });
});
