import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/orders.types';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { ReturnEntity } from './entities/return.entity';
import { RETURN_STATUS_FLOW, ReturnStatus } from './returns.types';

const RETURN_WINDOW_DAYS = 7;

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnEntity)
    private readonly returnsRepository: Repository<ReturnEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
  ) {}

  async createReturn(
    user: AuthenticatedUser,
    payload: CreateReturnDto,
  ): Promise<ReturnEntity> {
    const order = await this.ordersRepository.findOne({
      where: { id: payload.order_id },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    if (
      user.role === UserRole.USER &&
      (order.userId === null || order.userId !== user.id)
    ) {
      throw new ForbiddenException({
        message: 'You cannot create return for this order',
        details: { code: 'RETURN_FORBIDDEN' },
      });
    }
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException({
        message: 'Return is only allowed for delivered orders',
        details: { code: 'RETURN_ORDER_STATUS_INVALID' },
      });
    }

    const completedAt = order.completedAt ?? order.updatedAt;
    const allowedUntil = new Date(completedAt.getTime());
    allowedUntil.setDate(allowedUntil.getDate() + RETURN_WINDOW_DAYS);
    if (new Date() > allowedUntil) {
      throw new BadRequestException({
        message: 'Return window has expired',
        details: { code: 'RETURN_WINDOW_EXPIRED' },
      });
    }

    if (!order.userId) {
      throw new BadRequestException({
        message: 'Returns are not supported for guest orders',
        details: { code: 'RETURN_GUEST_NOT_SUPPORTED' },
      });
    }

    const existing = await this.returnsRepository.findOne({
      where: { orderId: payload.order_id },
    });
    if (existing) {
      throw new BadRequestException({
        message: 'Return already exists for this order',
        details: { code: 'RETURN_ALREADY_EXISTS' },
      });
    }

    return this.returnsRepository.save(
      this.returnsRepository.create({
        orderId: payload.order_id,
        userId: order.userId,
        reason: payload.reason.trim(),
        status: ReturnStatus.REQUESTED,
        note: payload.note.trim(),
        requestedAt: new Date(),
      }),
    );
  }

  async getReturnById(
    user: AuthenticatedUser,
    returnId: string,
  ): Promise<ReturnEntity> {
    const returnRequest = await this.returnsRepository.findOne({
      where: { id: returnId },
    });
    if (!returnRequest) {
      throw new NotFoundException({
        message: 'Return not found',
        details: { code: 'RETURN_NOT_FOUND' },
      });
    }
    if (user.role === UserRole.USER && returnRequest.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You cannot access this return',
        details: { code: 'RETURN_FORBIDDEN' },
      });
    }
    return returnRequest;
  }

  async listReturns(user: AuthenticatedUser, query: ListReturnsQueryDto) {
    const qb = this.returnsRepository
      .createQueryBuilder('return')
      .where('return.deleted_at IS NULL');

    if (query.status) {
      qb.andWhere('return.status = :status', { status: query.status });
    }

    if (user.role === UserRole.USER) {
      qb.andWhere('return.user_id = :userId', { userId: user.id });
    } else if (query.user_id) {
      qb.andWhere('return.user_id = :userId', { userId: query.user_id });
    }

    qb.orderBy('return.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateStatus(
    returnId: string,
    payload: UpdateReturnStatusDto,
  ): Promise<ReturnEntity> {
    const returnRequest = await this.returnsRepository.findOne({
      where: { id: returnId },
    });
    if (!returnRequest) {
      throw new NotFoundException({
        message: 'Return not found',
        details: { code: 'RETURN_NOT_FOUND' },
      });
    }

    this.ensureValidTransition(returnRequest.status, payload.status);

    returnRequest.status = payload.status;
    if (payload.note !== undefined) {
      returnRequest.note = payload.note.trim();
    }
    if (payload.status === ReturnStatus.APPROVED) {
      returnRequest.approvedAt = returnRequest.approvedAt ?? new Date();
    }
    if (payload.status === ReturnStatus.REJECTED) {
      returnRequest.rejectedAt = returnRequest.rejectedAt ?? new Date();
    }
    if (payload.status === ReturnStatus.RECEIVED) {
      returnRequest.receivedAt = returnRequest.receivedAt ?? new Date();
    }
    if (payload.status === ReturnStatus.COMPLETED) {
      if (returnRequest.receivedAt == null) {
        throw new BadRequestException({
          message: 'Cannot complete return before receiving item',
          details: { code: 'RETURN_RECEIVED_REQUIRED' },
        });
      }
      returnRequest.completedAt = returnRequest.completedAt ?? new Date();
    }
    if (payload.status === ReturnStatus.CANCELLED) {
      returnRequest.canceledAt = returnRequest.canceledAt ?? new Date();
    }

    return this.returnsRepository.save(returnRequest);
  }

  private ensureValidTransition(
    currentStatus: ReturnStatus,
    nextStatus: ReturnStatus,
  ): void {
    if (!RETURN_STATUS_FLOW[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException({
        message: 'Cannot update return status',
        details: {
          code: 'INVALID_RETURN',
          current_status: currentStatus,
          next_status: nextStatus,
        },
      });
    }
  }
}
