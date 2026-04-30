import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/payments.types';
import { OrderEntity } from './entities/order.entity';

@Injectable()
export class OrderQueryService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
  ) {}

  sanitizeOrderNote(note: string | null | undefined): string {
    const normalized = (note ?? '').trim();
    if (!normalized) {
      return '';
    }
    return normalized
      .replace(/\s*\[idempotency:[^\]]+\]\s*/gi, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  mapOrderListItem(
    order: OrderEntity,
    paymentMethod: PaymentMethod | null,
  ): OrderEntity & { paymentMethod: PaymentMethod | null; note: string } {
    return {
      ...order,
      note: this.sanitizeOrderNote(order.note),
      paymentMethod,
    };
  }

  async getLatestPaymentMethods(
    orderIds: string[],
  ): Promise<Record<string, PaymentMethod | null>> {
    if (orderIds.length === 0) {
      return {};
    }
    const payments = await this.paymentsRepository.find({
      where: orderIds.map((orderId) => ({ orderId })),
      order: { createdAt: 'DESC' },
    });
    const byOrderId: Record<string, PaymentMethod | null> = {};
    for (const payment of payments) {
      if (byOrderId[payment.orderId] !== undefined) {
        continue;
      }
      byOrderId[payment.orderId] = payment.method;
    }
    return byOrderId;
  }
}
