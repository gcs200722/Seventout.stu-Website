import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { UserEntity } from '../users/user.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { OrderEventOutboxEntity } from './entities/order-event-outbox.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderEventDispatcherService } from './events/order-event-dispatcher.service';
import { OrderCartPort } from './ports/order-cart.port';
import { OrderInventoryPort } from './ports/order-inventory.port';
import { OrdersService } from './orders.service';
import { OrderEventType, OrderStatus, PaymentStatus } from './orders.types';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let orderItemsRepository: jest.Mocked<Repository<OrderItemEntity>>;
  let outboxRepository: jest.Mocked<Repository<OrderEventOutboxEntity>>;
  let cartPort: jest.Mocked<OrderCartPort>;
  let inventoryPort: jest.Mocked<OrderInventoryPort>;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let paymentsRepository: jest.Mocked<Repository<PaymentEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let eventDispatcher: jest.Mocked<OrderEventDispatcherService>;

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
    inventoryPort = {
      reserveStock: jest.fn(),
      releaseStock: jest.fn(),
      commitStockOut: jest.fn(),
    };
    usersRepository = {
      findOne: jest.fn(),
    } as never;
    paymentsRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as never;
    dataSource = { transaction: jest.fn() } as never;
    eventDispatcher = { dispatch: jest.fn() } as never;

    service = new OrdersService(
      ordersRepository,
      orderItemsRepository,
      outboxRepository,
      usersRepository,
      paymentsRepository,
      cartPort,
      inventoryPort,
      dataSource,
      eventDispatcher,
    );
  });

  it('creates order and returns envelope', async () => {
    ordersRepository.findOne.mockResolvedValue(null);
    cartPort.getCheckoutCart.mockResolvedValue({
      cart_id: 'c-1',
      total_amount: 1000,
      items: [
        {
          product_id: 'p-1',
          product_name: 'Hoodie',
          price: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
    });
    usersRepository.findOne.mockResolvedValue({
      id: 'u-1',
      firstName: 'Nguyen',
      lastName: 'Van A',
      phone: '0909123456',
    } as UserEntity);
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
    outboxRepository.find.mockResolvedValue([]);

    const result = await service.createOrder(
      user,
      {
        cart_id: 'c-1',
        shipping_address: {
          address_line: '123 ABC Street',
          ward: 'Ward 5',
          city: 'Ho Chi Minh',
          country: 'Vietnam',
        },
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
    } as OrderEntity);

    const result = await service.createOrder(
      user,
      {
        cart_id: 'c-1',
        shipping_address: {
          address_line: '123 ABC Street',
          ward: 'Ward 5',
          city: 'Ho Chi Minh',
          country: 'Vietnam',
        },
      },
      'idmp-1',
    );
    expect(result.order_id).toBe('o-1');
    expect((cartPort.getCheckoutCart as jest.Mock).mock.calls.length).toBe(0);
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
    await expect(
      service.updateStatus('o-1', { status: OrderStatus.SHIPPED }),
    ).rejects.toThrow(BadRequestException);
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
});
