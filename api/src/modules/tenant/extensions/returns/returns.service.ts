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
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/orders.types';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { ReturnEntity } from './entities/return.entity';
import { RETURN_STATUS_FLOW, ReturnStatus } from './returns.types';
import { forTenantQb } from '../../core/context/for-tenant.util';

const RETURN_WINDOW_DAYS = 7;

@Injectable()
export class ReturnsService {
  private defaultTenantId: string | null = null;
  constructor(
    @InjectRepository(ReturnEntity)
    private readonly returnsRepository: Repository<ReturnEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async createReturn(
    user: AuthenticatedUser,
    payload: CreateReturnDto,
  ): Promise<ReturnEntity> {
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
    if (user.role === UserRole.USER && order.userId !== user.id) {
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

    const existing = await this.returnsRepository.findOne({
      where: { tenantId, orderId: payload.order_id },
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
        tenantId,
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
      where: { id: returnId, tenantId: await this.resolveTenantId() },
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
    const tenantId = await this.resolveTenantId();
    const qb = forTenantQb(
      this.returnsRepository
        .createQueryBuilder('return')
        .where('return.deleted_at IS NULL'),
      'return',
      tenantId,
    );

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
      where: { id: returnId, tenantId: await this.resolveTenantId() },
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
