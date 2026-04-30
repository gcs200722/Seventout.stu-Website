import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { OrderEntity } from '../orders/entities/order.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/payments.types';
import { ReturnEntity } from '../returns/entities/return.entity';
import { ReturnStatus } from '../returns/returns.types';
import { RefundEntity } from './entities/refund.entity';
import { RefundsService } from './refunds.service';
import { RefundMethod, RefundStatus } from './refunds.types';

describe('RefundsService', () => {
  let service: RefundsService;
  let refundsRepository: jest.Mocked<Repository<RefundEntity>>;
  let returnsRepository: jest.Mocked<Repository<ReturnEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let paymentsRepository: jest.Mocked<Repository<PaymentEntity>>;

  const user: AuthenticatedUser = {
    id: 'u-1',
    email: 'user@example.com',
    role: UserRole.USER,
    permissions: [],
  };

  beforeEach(() => {
    refundsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((payload) => payload as RefundEntity),
      createQueryBuilder: jest.fn(),
    } as never;
    returnsRepository = {
      findOne: jest.fn(),
    } as never;
    ordersRepository = {
      findOne: jest.fn(),
    } as never;
    paymentsRepository = {
      findOne: jest.fn(),
    } as never;

    const configService = {
      get: jest.fn((key: string) =>
        key === 'DEFAULT_TENANT_ID' ? 'tenant-1' : undefined,
      ),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ id: 'tenant-1' }]),
    };

    service = new RefundsService(
      refundsRepository,
      returnsRepository,
      ordersRepository,
      paymentsRepository,
      configService as never,
      dataSource as never,
    );
  });

  it('creates refund for received return', async () => {
    returnsRepository.findOne.mockResolvedValue({
      id: 'r-1',
      orderId: 'o-1',
      status: ReturnStatus.RECEIVED,
    } as ReturnEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      totalAmount: 700000,
    } as OrderEntity);
    refundsRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
    } as never);
    paymentsRepository.findOne.mockResolvedValue({
      orderId: 'o-1',
      method: PaymentMethod.COD,
    } as PaymentEntity);
    refundsRepository.save.mockResolvedValue({
      id: 'rf-1',
      status: RefundStatus.PENDING,
      method: RefundMethod.BANK_TRANSFER_MANUAL,
    } as RefundEntity);

    const result = await service.createRefund({
      return_id: 'r-1',
      amount: 500000,
    });

    expect(result.id).toBe('rf-1');
  });

  it('rejects refund when return is not received', async () => {
    returnsRepository.findOne.mockResolvedValue({
      id: 'r-1',
      status: ReturnStatus.APPROVED,
    } as ReturnEntity);

    await expect(
      service.createRefund({ return_id: 'r-1', amount: 100000 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects refund when amount exceeds remaining cap', async () => {
    returnsRepository.findOne.mockResolvedValue({
      id: 'r-1',
      orderId: 'o-1',
      status: ReturnStatus.RECEIVED,
    } as ReturnEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      totalAmount: 500000,
    } as OrderEntity);
    refundsRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '450000' }),
    } as never);

    await expect(
      service.createRefund({ return_id: 'r-1', amount: 100000 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks user reading refund from another owner', async () => {
    refundsRepository.findOne.mockResolvedValue({
      id: 'rf-1',
      orderId: 'o-1',
    } as RefundEntity);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: 'u-2',
    } as OrderEntity);

    await expect(service.getRefundById(user, 'rf-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('updates to success and sets processed_at', async () => {
    refundsRepository.findOne.mockResolvedValue({
      id: 'rf-1',
      status: RefundStatus.PROCESSING,
      processedAt: null,
    } as RefundEntity);
    refundsRepository.save.mockResolvedValue({
      id: 'rf-1',
      status: RefundStatus.SUCCESS,
      processedAt: new Date(),
    } as RefundEntity);

    const result = await service.updateStatus('rf-1', {
      status: RefundStatus.SUCCESS,
    });

    expect(result.status).toBe(RefundStatus.SUCCESS);
    expect(result.processedAt).toBeTruthy();
  });

  it('rejects invalid refund transition', async () => {
    refundsRepository.findOne.mockResolvedValue({
      id: 'rf-1',
      status: RefundStatus.PENDING,
    } as RefundEntity);

    await expect(
      service.updateStatus('rf-1', { status: RefundStatus.SUCCESS }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws not found when refund does not exist', async () => {
    refundsRepository.findOne.mockResolvedValue(null);

    await expect(service.getRefundById(user, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
