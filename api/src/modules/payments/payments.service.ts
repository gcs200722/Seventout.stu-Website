import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { NotificationService } from '../notification/notification.service';
import { OrderEntity } from '../orders/entities/order.entity';
import { PaymentStatus as OrderPaymentStatus } from '../orders/orders.types';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.query.dto';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentMethod, PaymentStatus } from './payments.types';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  async createPayment(
    user: AuthenticatedUser,
    payload: CreatePaymentDto,
    idempotencyKey?: string,
  ): Promise<{
    payment_id: string;
    status: PaymentStatus;
    method: PaymentMethod;
  }> {
    const normalizedKey = idempotencyKey?.trim() || null;
    if (normalizedKey) {
      const duplicated = await this.paymentsRepository.findOne({
        where: { idempotencyKey: normalizedKey },
      });
      if (duplicated) {
        return {
          payment_id: duplicated.id,
          status: duplicated.status,
          method: duplicated.method,
        };
      }
    }

    const order = await this.ordersRepository.findOne({
      where: { id: payload.order_id },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    if (user.role === UserRole.USER && order.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You cannot create payment for this order',
        details: { code: 'PAYMENT_FORBIDDEN' },
      });
    }
    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      throw new BadRequestException({
        message: 'Order has already been paid',
        details: { code: 'ORDER_ALREADY_PAID' },
      });
    }
    if (payload.payment_method !== PaymentMethod.COD) {
      throw new BadRequestException({
        message: 'Payment method is not supported in phase 1',
        details: { code: 'PAYMENT_METHOD_NOT_SUPPORTED' },
      });
    }

    const activePayment = await this.paymentsRepository.findOne({
      where: [{ orderId: payload.order_id, status: PaymentStatus.PENDING }],
    });
    if (activePayment) {
      throw new BadRequestException({
        message: 'An active payment already exists for this order',
        details: { code: 'PAYMENT_ALREADY_EXISTS' },
      });
    }

    const payment = await this.paymentsRepository.save(
      this.paymentsRepository.create({
        orderId: payload.order_id,
        method: payload.payment_method,
        status: PaymentStatus.PENDING,
        amount: order.totalAmount,
        idempotencyKey: normalizedKey,
      }),
    );

    return {
      payment_id: payment.id,
      status: payment.status,
      method: payment.method,
    };
  }

  async createGuestCodPayment(orderId: string): Promise<{
    payment_id: string;
    status: PaymentStatus;
    method: PaymentMethod;
  }> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }
    if (order.userId !== null) {
      throw new BadRequestException({
        message: 'Order is not a guest order',
        details: { code: 'ORDER_NOT_GUEST' },
      });
    }
    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      throw new BadRequestException({
        message: 'Order has already been paid',
        details: { code: 'ORDER_ALREADY_PAID' },
      });
    }

    const activePayment = await this.paymentsRepository.findOne({
      where: [{ orderId, status: PaymentStatus.PENDING }],
    });
    if (activePayment) {
      return {
        payment_id: activePayment.id,
        status: activePayment.status,
        method: activePayment.method,
      };
    }

    const payment = await this.paymentsRepository.save(
      this.paymentsRepository.create({
        orderId,
        method: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
        amount: order.totalAmount,
        idempotencyKey: null,
      }),
    );

    return {
      payment_id: payment.id,
      status: payment.status,
      method: payment.method,
    };
  }

  async getPaymentById(
    user: AuthenticatedUser,
    paymentId: string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException({
        message: 'Payment not found',
        details: { code: 'PAYMENT_NOT_FOUND' },
      });
    }

    const order = await this.ordersRepository.findOne({
      where: { id: payment.orderId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        details: { code: 'ORDER_NOT_FOUND' },
      });
    }

    if (user.role === UserRole.USER && order.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You cannot access this payment',
        details: { code: 'PAYMENT_FORBIDDEN' },
      });
    }

    return payment;
  }

  async listPayments(query: ListPaymentsQueryDto) {
    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.deleted_at IS NULL');

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }
    if (query.method) {
      qb.andWhere('payment.method = :method', { method: query.method });
    }

    qb.orderBy('payment.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async confirmPayment(
    paymentId: string,
    payload: ConfirmPaymentDto,
  ): Promise<{ payment_id: string; status: PaymentStatus }> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException({
        message: 'Payment not found',
        details: { code: 'PAYMENT_NOT_FOUND' },
      });
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException({
        message: 'Payment is not in pending state',
        details: { code: 'PAYMENT_STATUS_INVALID' },
      });
    }

    const paymentResultEvent =
      payload.status === PaymentStatus.SUCCESS
        ? 'SUCCESS'
        : payload.status === PaymentStatus.FAILED
          ? 'FAILED'
          : null;

    await this.dataSource.transaction(async (manager) => {
      payment.status = payload.status;
      payment.transactionId = payment.transactionId ?? `mock-${payment.id}`;
      await manager.getRepository(PaymentEntity).save(payment);

      if (!paymentResultEvent) {
        return;
      }
      const order = await manager
        .getRepository(OrderEntity)
        .findOne({ where: { id: payment.orderId } });
      if (!order) {
        throw new NotFoundException({
          message: 'Order not found',
          details: { code: 'ORDER_NOT_FOUND' },
        });
      }
      order.paymentStatus =
        paymentResultEvent === 'SUCCESS'
          ? OrderPaymentStatus.PAID
          : OrderPaymentStatus.FAILED;
      await manager.getRepository(OrderEntity).save(order);
    });

    if (paymentResultEvent) {
      await this.notificationService.notifyPaymentResult(
        payment.orderId,
        paymentResultEvent,
        `payment:${payment.id}:${paymentResultEvent.toLowerCase()}`,
      );
    }

    return { payment_id: payment.id, status: payment.status };
  }
}
