import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { PaymentStatus as OrderPaymentStatus } from '../orders/orders.types';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentMethod, PaymentStatus } from './payments.types';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: jest.Mocked<Repository<PaymentEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let ordersService: jest.Mocked<OrdersService>;

  const user: AuthenticatedUser = {
    id: 'u-1',
    email: 'u@example.com',
    role: UserRole.USER,
    permissions: [],
  };

  beforeEach(() => {
    paymentsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((p: unknown) => p as PaymentEntity),
      createQueryBuilder: jest.fn(),
    } as never;
    ordersRepository = {
      findOne: jest.fn(),
    } as never;
    ordersService = {
      markOrderPaymentStatus: jest.fn(),
    } as never;

    service = new PaymentsService(
      paymentsRepository,
      ordersRepository,
      ordersService,
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
    ordersService.markOrderPaymentStatus.mockResolvedValue({
      payment_status: OrderPaymentStatus.PAID,
    });

    const result = await service.confirmPayment('p-1', {
      status: PaymentStatus.SUCCESS,
    });

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(
      (ordersService.markOrderPaymentStatus as jest.Mock).mock.calls[0],
    ).toEqual(['o-1', OrderPaymentStatus.PAID]);
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
    ordersService.markOrderPaymentStatus.mockResolvedValue({
      payment_status: OrderPaymentStatus.FAILED,
    });

    const result = await service.confirmPayment('p-1', {
      status: PaymentStatus.FAILED,
    });

    expect(result.status).toBe(PaymentStatus.FAILED);
    expect(
      (ordersService.markOrderPaymentStatus as jest.Mock).mock.calls[0],
    ).toEqual(['o-1', OrderPaymentStatus.FAILED]);
  });
});
