import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from './orders.types';

@Injectable()
export class OrderStatusPolicy {
  ensureValidTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): void {
    const flow: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELED]: [],
    };
    if (!flow[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException({
        message: 'Order status transition is invalid',
        details: {
          code: 'ORDER_STATUS_INVALID',
          current_status: currentStatus,
          next_status: nextStatus,
        },
      });
    }
  }

  ensureValidPaymentTransition(
    currentStatus: PaymentStatus,
    nextStatus: PaymentStatus,
  ): void {
    const flow: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.UNPAID]: [PaymentStatus.PAID, PaymentStatus.FAILED],
      [PaymentStatus.PAID]: [],
      [PaymentStatus.FAILED]: [PaymentStatus.PAID],
      [PaymentStatus.REFUNDED]: [],
    };

    if (!flow[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException({
        message: 'Order payment status transition is invalid',
        details: {
          code: 'ORDER_PAYMENT_STATUS_INVALID',
          current_status: currentStatus,
          next_status: nextStatus,
        },
      });
    }
  }
}
