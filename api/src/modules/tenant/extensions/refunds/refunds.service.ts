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
import { PaymentEntity } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/payments.types';
import { ReturnEntity } from '../returns/entities/return.entity';
import { ReturnStatus } from '../returns/returns.types';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ListRefundsQueryDto } from './dto/list-refunds.query.dto';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';
import { RefundEntity } from './entities/refund.entity';
import {
  REFUND_STATUS_FLOW,
  RefundMethod,
  RefundStatus,
} from './refunds.types';
import { forTenantQb } from '../../core/context/for-tenant.util';

@Injectable()
export class RefundsService {
  private defaultTenantId: string | null = null;
  constructor(
    @InjectRepository(RefundEntity)
    private readonly refundsRepository: Repository<RefundEntity>,
    @InjectRepository(ReturnEntity)
    private readonly returnsRepository: Repository<ReturnEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async createRefund(payload: CreateRefundDto): Promise<RefundEntity> {
    const tenantId = await this.resolveTenantId();
    const returnRequest = await this.returnsRepository.findOne({
      where: { tenantId, id: payload.return_id },
    });
    if (!returnRequest) {
      throw new NotFoundException({
        message: 'Return not found',
        details: { code: 'RETURN_NOT_FOUND' },
      });
    }
    if (returnRequest.status !== ReturnStatus.RECEIVED) {
      throw new BadRequestException({
        message: 'Refund is only allowed when return is received',
        details: { code: 'REFUND_RETURN_STATUS_INVALID' },
      });
    }

    const order = await this.ordersRepository.findOne({
      where: { tenantId, id: returnRequest.orderId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    if (payload.amount > order.totalAmount) {
      throw new BadRequestException({
        message: 'Refund amount exceeds order total amount',
        details: { code: 'REFUND_AMOUNT_EXCEEDS_ORDER_TOTAL' },
      });
    }

    const aggregate = await this.refundsRepository
      .createQueryBuilder('refund')
      .select('COALESCE(SUM(refund.amount), 0)', 'sum')
      .where('refund.order_id = :orderId', { orderId: order.id })
      .andWhere('refund.tenant_id = :tenantId', { tenantId })
      .andWhere('refund.deleted_at IS NULL')
      .getRawOne<{ sum: string }>();
    const alreadyRefunded = Number(aggregate?.sum ?? 0);
    if (alreadyRefunded + payload.amount > order.totalAmount) {
      throw new BadRequestException({
        message: 'Refund amount exceeds remaining refundable amount',
        details: { code: 'REFUND_AMOUNT_EXCEEDS_REMAINING' },
      });
    }

    const latestPayment = await this.paymentsRepository.findOne({
      where: { tenantId, orderId: order.id },
      order: { createdAt: 'DESC' },
    });
    const inferredMethod = this.resolveRefundMethodFromPayment(latestPayment);

    return this.refundsRepository.save(
      this.refundsRepository.create({
        returnId: returnRequest.id,
        tenantId,
        orderId: order.id,
        amount: payload.amount,
        method: payload.method ?? inferredMethod,
        status: RefundStatus.PENDING,
        processedAt: null,
      }),
    );
  }

  async getRefundById(
    user: AuthenticatedUser,
    refundId: string,
  ): Promise<RefundEntity> {
    const refund = await this.refundsRepository.findOne({
      where: { id: refundId, tenantId: await this.resolveTenantId() },
    });
    if (!refund) {
      throw new NotFoundException({
        message: 'Refund not found',
        details: { code: 'REFUND_NOT_FOUND' },
      });
    }

    if (user.role === UserRole.USER) {
      const order = await this.ordersRepository.findOne({
        where: { id: refund.orderId, tenantId: await this.resolveTenantId() },
      });
      if (!order) {
        throw new NotFoundException({
          message: 'Order not found',
          details: { code: 'ORDER_NOT_FOUND' },
        });
      }
      if (order.userId !== user.id) {
        throw new ForbiddenException({
          message: 'You cannot access this refund',
          details: { code: 'REFUND_FORBIDDEN' },
        });
      }
    }

    return refund;
  }

  async listRefunds(user: AuthenticatedUser, query: ListRefundsQueryDto) {
    const tenantId = await this.resolveTenantId();
    const qb = forTenantQb(
      this.refundsRepository
        .createQueryBuilder('refund')
        .where('refund.deleted_at IS NULL'),
      'refund',
      tenantId,
    );

    if (query.status) {
      qb.andWhere('refund.status = :status', { status: query.status });
    }
    if (query.order_id) {
      qb.andWhere('refund.order_id = :orderId', { orderId: query.order_id });
    }
    if (query.return_id) {
      qb.andWhere('refund.return_id = :returnId', {
        returnId: query.return_id,
      });
    }

    if (user.role === UserRole.USER) {
      qb.innerJoin(OrderEntity, 'order', 'order.id = refund.order_id');
      qb.andWhere('order.user_id = :userId', { userId: user.id });
    }

    qb.orderBy('refund.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateStatus(
    refundId: string,
    payload: UpdateRefundStatusDto,
  ): Promise<RefundEntity> {
    const refund = await this.refundsRepository.findOne({
      where: { id: refundId, tenantId: await this.resolveTenantId() },
    });
    if (!refund) {
      throw new NotFoundException({
        message: 'Refund not found',
        details: { code: 'REFUND_NOT_FOUND' },
      });
    }

    this.ensureValidTransition(refund.status, payload.status);
    refund.status = payload.status;
    if (payload.status === RefundStatus.SUCCESS) {
      refund.processedAt = refund.processedAt ?? new Date();
    }
    return this.refundsRepository.save(refund);
  }

  private ensureValidTransition(
    currentStatus: RefundStatus,
    nextStatus: RefundStatus,
  ): void {
    if (!REFUND_STATUS_FLOW[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException({
        message: 'Cannot update refund status',
        details: {
          code: 'INVALID_REFUND',
          current_status: currentStatus,
          next_status: nextStatus,
        },
      });
    }
  }

  private resolveRefundMethodFromPayment(
    payment: PaymentEntity | null,
  ): RefundMethod {
    if (!payment || payment.method === PaymentMethod.COD) {
      return RefundMethod.BANK_TRANSFER_MANUAL;
    }
    if (payment.method === PaymentMethod.VNPAY) {
      return RefundMethod.VNPAY;
    }
    if (payment.method === PaymentMethod.STRIPE) {
      return RefundMethod.STRIPE;
    }
    return RefundMethod.BANK_TRANSFER_MANUAL;
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
