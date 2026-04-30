/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { NotificationService } from '../../core/notification/notification.service';
import { OrderEntity } from '../orders/entities/order.entity';
import { PaymentStatus as OrderPaymentStatus } from '../orders/orders.types';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentMethod, PaymentStatus } from './payments.types';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: jest.Mocked<Repository<PaymentEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let notificationService: jest.Mocked<NotificationService>;

  const user: AuthenticatedUser = {
    id: 'u-1',
    email: 'u@example.com',
    role: UserRole.USER,
    permissions: [],
  };

  function mockTransactionManager() {
    dataSource.transaction.mockImplementation(
      (arg1: unknown, arg2?: unknown): Promise<unknown> => {
        type TransactionRunner = (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown;
        const runInTransaction: TransactionRunner | null =
          typeof arg1 === 'function'
            ? (arg1 as TransactionRunner)
            : typeof arg2 === 'function'
              ? (arg2 as TransactionRunner)
              : null;
        if (!runInTransaction) {
          throw new Error('Transaction callback is required');
        }
        return Promise.resolve(
          runInTransaction({
            getRepository: (entity: unknown) =>
              entity === PaymentEntity ? paymentsRepository : ordersRepository,
          }),
        );
      },
    );
  }

  beforeEach(() => {
    paymentsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((p: unknown) => p as PaymentEntity),
      createQueryBuilder: jest.fn(),
    } as never;
    ordersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as never;
    dataSource = {
      transaction: jest.fn(),
    } as never;
    notificationService = {
      notifyPaymentResult: jest.fn(),
    } as never;

    const configService = {
      get: jest.fn((key: string) =>
        key === 'DEFAULT_TENANT_ID' ? 'tenant-1' : undefined,
      ),
    };

    service = new PaymentsService(
      paymentsRepository,
      ordersRepository,
      configService as never,
      dataSource,
      notificationService,
    );
  });

  it('creates COD payment as pending', async () => {
    paymentsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: 'u-1',
      totalAmount: 1200,
      paymentStatus: OrderPaymentStatus.UNPAID,
    } as OrderEntity);
    paymentsRepository.save.mockResolvedValue({
      id: 'p-1',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.COD,
    } as PaymentEntity);

    const result = await service.createPayment(
      user,
      { order_id: 'o-1', payment_method: PaymentMethod.COD },
      'idmp-1',
    );

    expect(result).toEqual({
      payment_id: 'p-1',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.COD,
    });
  });

  it('returns duplicated payment when idempotency key exists', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.COD,
    } as PaymentEntity);

    const result = await service.createPayment(
      user,
      { order_id: 'o-1', payment_method: PaymentMethod.COD },
      'idmp-1',
    );

    expect(result.payment_id).toBe('p-1');
    expect((ordersRepository.findOne as jest.Mock).mock.calls.length).toBe(0);
  });

  it('rejects create when order is already paid', async () => {
    paymentsRepository.findOne.mockResolvedValue(null);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: 'u-1',
      totalAmount: 1200,
      paymentStatus: OrderPaymentStatus.PAID,
    } as OrderEntity);

    await expect(
      service.createPayment(user, {
        order_id: 'o-1',
        payment_method: PaymentMethod.COD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects user reading payment of another user order', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      orderId: 'o-1',
    } as PaymentEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: 'u-2',
    } as OrderEntity);

    await expect(service.getPaymentById(user, 'p-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws not found for missing payment', async () => {
    paymentsRepository.findOne.mockResolvedValue(null);
    await expect(service.getPaymentById(user, 'p-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('confirms success payment and updates order payment status', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      orderId: 'o-1',
      status: PaymentStatus.PENDING,
      transactionId: null,
    } as PaymentEntity);
    paymentsRepository.save.mockResolvedValue({
      id: 'p-1',
      status: PaymentStatus.SUCCESS,
    } as PaymentEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      tenantId: 'tenant-1',
      paymentStatus: OrderPaymentStatus.UNPAID,
    } as OrderEntity);
    ordersRepository.save.mockResolvedValue({
      id: 'o-1',
      tenantId: 'tenant-1',
      paymentStatus: OrderPaymentStatus.PAID,
    } as OrderEntity);
    mockTransactionManager();

    const result = await service.confirmPayment('p-1', {
      status: PaymentStatus.SUCCESS,
    });

    expect(result.status).toBe(PaymentStatus.SUCCESS);

    const saveOrderMock = ordersRepository.save as jest.Mock;

    const notifyPaymentResultMock =
      notificationService.notifyPaymentResult as jest.Mock;
    expect(saveOrderMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        paymentStatus: OrderPaymentStatus.PAID,
      }),
    );
    expect(notifyPaymentResultMock.mock.calls[0]).toEqual([
      'o-1',
      'SUCCESS',
      'payment:tenant-1:p-1:success',
    ]);
  });

  it('confirms failed payment and updates order payment status', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      orderId: 'o-1',
      status: PaymentStatus.PENDING,
      transactionId: null,
    } as PaymentEntity);
    paymentsRepository.save.mockResolvedValue({
      id: 'p-1',
      status: PaymentStatus.FAILED,
    } as PaymentEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      tenantId: 'tenant-1',
      paymentStatus: OrderPaymentStatus.UNPAID,
    } as OrderEntity);
    ordersRepository.save.mockResolvedValue({
      id: 'o-1',
      tenantId: 'tenant-1',
      paymentStatus: OrderPaymentStatus.FAILED,
    } as OrderEntity);
    mockTransactionManager();

    const result = await service.confirmPayment('p-1', {
      status: PaymentStatus.FAILED,
    });

    expect(result.status).toBe(PaymentStatus.FAILED);

    const saveOrderMock = ordersRepository.save as jest.Mock;

    const notifyPaymentResultMock =
      notificationService.notifyPaymentResult as jest.Mock;
    expect(saveOrderMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        paymentStatus: OrderPaymentStatus.FAILED,
      }),
    );
    expect(notifyPaymentResultMock.mock.calls[0]).toEqual([
      'o-1',
      'FAILED',
      'payment:tenant-1:p-1:failed',
    ]);
  });
});
