import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/orders.types';
import { ReturnEntity } from './entities/return.entity';
import { ReturnsService } from './returns.service';
import { ReturnStatus } from './returns.types';

describe('ReturnsService', () => {
  let service: ReturnsService;
  let returnsRepository: jest.Mocked<Repository<ReturnEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;

  const user: AuthenticatedUser = {
    id: 'u-1',
    email: 'user@example.com',
    role: UserRole.USER,
    permissions: [],
  };

  beforeEach(() => {
    returnsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((payload) => payload as ReturnEntity),
      createQueryBuilder: jest.fn(),
    } as never;
    ordersRepository = {
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

    service = new ReturnsService(
      returnsRepository,
      ordersRepository,
      configService as never,
      dataSource as never,
    );
  });

  it('creates return when order is completed and in time window', async () => {
    const completedAt = new Date();
    completedAt.setDate(completedAt.getDate() - 1);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: user.id,
      status: OrderStatus.COMPLETED,
      completedAt,
      updatedAt: completedAt,
    } as OrderEntity);
    returnsRepository.findOne.mockResolvedValue(null);
    returnsRepository.save.mockResolvedValue({
      id: 'r-1',
      orderId: 'o-1',
      userId: user.id,
      status: ReturnStatus.REQUESTED,
    } as ReturnEntity);

    const result = await service.createReturn(user, {
      order_id: 'o-1',
      reason: 'Damaged item',
      note: 'Broken package',
    });

    expect(result.id).toBe('r-1');
  });

  it('rejects when user creates return for another owner order', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: 'u-2',
      status: OrderStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
    } as OrderEntity);

    await expect(
      service.createReturn(user, {
        order_id: 'o-1',
        reason: 'Damaged item',
        note: '',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects when return window is expired', async () => {
    const completedAt = new Date();
    completedAt.setDate(completedAt.getDate() - 8);
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: user.id,
      status: OrderStatus.COMPLETED,
      completedAt,
      updatedAt: completedAt,
    } as OrderEntity);

    await expect(
      service.createReturn(user, {
        order_id: 'o-1',
        reason: 'Wrong size',
        note: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate return by order', async () => {
    const completedAt = new Date();
    ordersRepository.findOne.mockResolvedValue({
      id: 'o-1',
      userId: user.id,
      status: OrderStatus.COMPLETED,
      completedAt,
      updatedAt: completedAt,
    } as OrderEntity);
    returnsRepository.findOne.mockResolvedValue({
      id: 'r-1',
      orderId: 'o-1',
    } as ReturnEntity);

    await expect(
      service.createReturn(user, {
        order_id: 'o-1',
        reason: 'Damaged item',
        note: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid transition', async () => {
    returnsRepository.findOne.mockResolvedValue({
      id: 'r-1',
      status: ReturnStatus.REQUESTED,
    } as ReturnEntity);

    await expect(
      service.updateStatus('r-1', { status: ReturnStatus.COMPLETED }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets received timestamp when status becomes received', async () => {
    returnsRepository.findOne.mockResolvedValue({
      id: 'r-1',
      status: ReturnStatus.APPROVED,
      note: '',
    } as ReturnEntity);
    returnsRepository.save.mockResolvedValue({
      id: 'r-1',
      status: ReturnStatus.RECEIVED,
      receivedAt: new Date(),
    } as ReturnEntity);

    const result = await service.updateStatus('r-1', {
      status: ReturnStatus.RECEIVED,
    });

    expect(result.status).toBe(ReturnStatus.RECEIVED);
    expect(result.receivedAt).toBeTruthy();
  });

  it('throws not found for unknown return', async () => {
    returnsRepository.findOne.mockResolvedValue(null);

    await expect(service.getReturnById(user, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
