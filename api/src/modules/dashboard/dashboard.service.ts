import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus, PaymentStatus } from '../orders/orders.types';
import { RefundEntity } from '../refunds/entities/refund.entity';
import { RefundStatus } from '../refunds/refunds.types';
import { ReturnEntity } from '../returns/entities/return.entity';
import { ReturnStatus } from '../returns/returns.types';
import { DashboardComparePreset } from './dto/get-dashboard-summary.query.dto';
import { UserEntity } from '../users/user.entity';
import { UserRole } from '../authorization/authorization.types';

const ORDER_BACKLOG_HOURS = 2;
const RETURNS_BACKLOG_HOURS = 24;
const REFUNDS_BACKLOG_HOURS = 24;

type DateRange = {
  from: Date;
  to: Date;
};

type DashboardMetrics = {
  grossRevenue: number;
  paidOrders: number;
  aov: number;
};

type TrendStatus = 'GOOD' | 'NEUTRAL' | 'BAD';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(ReturnEntity)
    private readonly returnsRepository: Repository<ReturnEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundsRepository: Repository<RefundEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async getSummary(compare: DashboardComparePreset) {
    const now = new Date();
    const todayRange = this.getDayRange(now);
    const compareRange = this.getCompareRange(todayRange, compare);
    const [
      todayMetrics,
      compareMetrics,
      issueSnapshot,
      orderStatusBreakdown,
      hourlySeries,
      revenue7d,
      newCustomersToday,
      newCustomerHourlySeries,
      recentOrders,
    ] = await Promise.all([
      this.calculateMetrics(todayRange),
      this.calculateMetrics(compareRange),
      this.getIssueSnapshot(now),
      this.getOrderStatusBreakdown(todayRange),
      this.getHourlySeries(todayRange),
      this.getRevenueLast7Days(todayRange),
      this.getNewCustomersToday(todayRange),
      this.getCustomerHourlySeries(todayRange),
      this.getRecentOrders(),
    ]);

    const revenueDeltaPercent = this.calculateDeltaPercent(
      todayMetrics.grossRevenue,
      compareMetrics.grossRevenue,
    );
    const paidOrderDeltaPercent = this.calculateDeltaPercent(
      todayMetrics.paidOrders,
      compareMetrics.paidOrders,
    );
    const aovDeltaPercent = this.calculateDeltaPercent(
      todayMetrics.aov,
      compareMetrics.aov,
    );

    const actionQueue = [
      {
        key: 'pending_orders',
        label: 'Đơn chờ xử lý quá hạn',
        count: issueSnapshot.pendingOrdersTooLong,
        href: '/admin/orders',
      },
      {
        key: 'returns_inspection',
        label: 'Return chờ kiểm tra hàng',
        count: issueSnapshot.returnsAwaitingInspection,
        href: '/admin/returns',
      },
      {
        key: 'refunds_stuck',
        label: 'Refund pending quá hạn',
        count: issueSnapshot.refundsStuck,
        href: '/admin/returns',
      },
    ];

    return {
      generatedAt: now.toISOString(),
      today: {
        range: {
          from: todayRange.from.toISOString(),
          to: todayRange.to.toISOString(),
        },
        metrics: {
          ...todayMetrics,
          newCustomers: newCustomersToday,
        },
      },
      compare: {
        preset: compare,
        range: {
          from: compareRange.from.toISOString(),
          to: compareRange.to.toISOString(),
        },
        metrics: compareMetrics,
      },
      trend: {
        revenueDeltaPercent,
        paidOrderDeltaPercent,
        aovDeltaPercent,
        revenueStatus: this.getTrendStatus(revenueDeltaPercent),
        paidOrderStatus: this.getTrendStatus(paidOrderDeltaPercent),
        aovStatus: this.getTrendStatus(aovDeltaPercent),
      },
      issues: {
        ...issueSnapshot,
        thresholds: {
          pendingOrdersHours: ORDER_BACKLOG_HOURS,
          returnsHours: RETURNS_BACKLOG_HOURS,
          refundsHours: REFUNDS_BACKLOG_HOURS,
        },
      },
      orderStatusBreakdown,
      statusDonut: this.toStatusDonut(orderStatusBreakdown),
      charts: {
        hourly: hourlySeries,
        revenue7d,
        sparkline: {
          revenue: hourlySeries.map((item) => item.revenue),
          orders: hourlySeries.map((item) => item.orders),
          aov: hourlySeries.map((item) =>
            item.orders > 0 ? Math.round(item.revenue / item.orders) : 0,
          ),
          newCustomers: newCustomerHourlySeries.map((item) => item.count),
        },
      },
      actionQueue,
      recentOrders,
    };
  }

  private async calculateMetrics(range: DateRange): Promise<DashboardMetrics> {
    const result = await this.ordersRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total_amount), 0)', 'gross_revenue')
      .addSelect('COUNT(*)', 'paid_orders')
      .where('order.deleted_at IS NULL')
      .andWhere('order.created_at >= :from AND order.created_at < :to', range)
      .andWhere('order.payment_status = :paidStatus', {
        paidStatus: PaymentStatus.PAID,
      })
      .andWhere('order.status = :completedStatus', {
        completedStatus: OrderStatus.COMPLETED,
      })
      .getRawOne<{ gross_revenue: string; paid_orders: string }>();

    const grossRevenue = Number(result?.gross_revenue ?? 0);
    const paidOrders = Number(result?.paid_orders ?? 0);
    return {
      grossRevenue,
      paidOrders,
      aov: paidOrders > 0 ? Math.round(grossRevenue / paidOrders) : 0,
    };
  }

  private async getIssueSnapshot(now: Date) {
    const orderCutoff = new Date(
      now.getTime() - ORDER_BACKLOG_HOURS * 60 * 60 * 1000,
    );
    const returnCutoff = new Date(
      now.getTime() - RETURNS_BACKLOG_HOURS * 60 * 60 * 1000,
    );
    const refundCutoff = new Date(
      now.getTime() - REFUNDS_BACKLOG_HOURS * 60 * 60 * 1000,
    );

    const [pendingOrdersTooLong, returnsAwaitingInspection, refundsStuck] =
      await Promise.all([
        this.ordersRepository
          .createQueryBuilder('order')
          .where('order.deleted_at IS NULL')
          .andWhere('order.status IN (:...statuses)', {
            statuses: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING],
          })
          .andWhere('order.created_at <= :orderCutoff', { orderCutoff })
          .getCount(),
        this.returnsRepository
          .createQueryBuilder('return')
          .where('return.deleted_at IS NULL')
          .andWhere('return.status = :status', {
            status: ReturnStatus.RECEIVED,
          })
          .andWhere(
            'COALESCE(return.received_at, return.updated_at, return.created_at) <= :returnCutoff',
            { returnCutoff },
          )
          .getCount(),
        this.refundsRepository
          .createQueryBuilder('refund')
          .where('refund.deleted_at IS NULL')
          .andWhere('refund.status = :status', { status: RefundStatus.PENDING })
          .andWhere('refund.created_at <= :refundCutoff', { refundCutoff })
          .getCount(),
      ]);

    return {
      pendingOrdersTooLong,
      returnsAwaitingInspection,
      refundsStuck,
    };
  }

  private async getOrderStatusBreakdown(range: DateRange) {
    const rows = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.deleted_at IS NULL')
      .andWhere('order.created_at >= :from AND order.created_at < :to', range)
      .groupBy('order.status')
      .getRawMany<{ status: OrderStatus; count: string }>();

    const allStatuses = [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELED,
      OrderStatus.PENDING,
    ];

    return allStatuses.map((status) => {
      const row = rows.find((item) => item.status === status);
      return { status, count: Number(row?.count ?? 0) };
    });
  }

  private toStatusDonut(
    breakdown: Array<{ status: OrderStatus; count: number }>,
  ): Array<{ status: OrderStatus; count: number; percent: number }> {
    const total = breakdown.reduce((sum, item) => sum + item.count, 0);
    return breakdown.map((item) => ({
      ...item,
      percent: total > 0 ? Number(((item.count / total) * 100).toFixed(2)) : 0,
    }));
  }

  private async getHourlySeries(range: DateRange) {
    const rows = await this.ordersRepository
      .createQueryBuilder('order')
      .select('EXTRACT(HOUR FROM order.created_at)', 'hour')
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN order.payment_status = :paidStatus AND order.status = :completedStatus
          THEN order.total_amount ELSE 0 END), 0)`,
        'revenue',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN order.payment_status = :paidStatus AND order.status = :completedStatus
          THEN 1 ELSE 0 END), 0)`,
        'orders',
      )
      .where('order.deleted_at IS NULL')
      .andWhere('order.created_at >= :from AND order.created_at < :to', range)
      .setParameters({
        paidStatus: PaymentStatus.PAID,
        completedStatus: OrderStatus.COMPLETED,
      })
      .groupBy('EXTRACT(HOUR FROM order.created_at)')
      .orderBy('EXTRACT(HOUR FROM order.created_at)', 'ASC')
      .getRawMany<{ hour: string; revenue: string; orders: string }>();

    const byHour = new Map<number, { revenue: number; orders: number }>();
    for (const row of rows) {
      const hour = Number(row.hour);
      byHour.set(hour, {
        revenue: Number(row.revenue ?? 0),
        orders: Number(row.orders ?? 0),
      });
    }

    return Array.from({ length: 24 }).map((_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      revenue: byHour.get(hour)?.revenue ?? 0,
      orders: byHour.get(hour)?.orders ?? 0,
    }));
  }

  private async getCustomerHourlySeries(range: DateRange) {
    const rows = await this.usersRepository
      .createQueryBuilder('user')
      .select('EXTRACT(HOUR FROM user.created_at)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('user.deleted_at IS NULL')
      .andWhere('user.role = :role', { role: UserRole.USER })
      .andWhere('user.created_at >= :from AND user.created_at < :to', range)
      .groupBy('EXTRACT(HOUR FROM user.created_at)')
      .orderBy('EXTRACT(HOUR FROM user.created_at)', 'ASC')
      .getRawMany<{ hour: string; count: string }>();

    const byHour = new Map<number, number>();
    for (const row of rows) {
      byHour.set(Number(row.hour), Number(row.count ?? 0));
    }
    return Array.from({ length: 24 }).map((_, hour) => ({
      hour,
      count: byHour.get(hour) ?? 0,
    }));
  }

  private async getRevenueLast7Days(todayRange: DateRange) {
    const from = new Date(todayRange.from);
    from.setDate(from.getDate() - 6);
    const to = new Date(todayRange.to);

    const rows = await this.ordersRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('day', order.created_at)", 'day')
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN order.payment_status = :paidStatus AND order.status = :completedStatus
          THEN order.total_amount ELSE 0 END), 0)`,
        'revenue',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN order.payment_status = :paidStatus AND order.status = :completedStatus
          THEN 1 ELSE 0 END), 0)`,
        'orders',
      )
      .where('order.deleted_at IS NULL')
      .andWhere('order.created_at >= :from AND order.created_at < :to', {
        from,
        to,
      })
      .setParameters({
        paidStatus: PaymentStatus.PAID,
        completedStatus: OrderStatus.COMPLETED,
      })
      .groupBy("DATE_TRUNC('day', order.created_at)")
      .orderBy("DATE_TRUNC('day', order.created_at)", 'ASC')
      .getRawMany<{ day: string; revenue: string; orders: string }>();

    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const row of rows) {
      const date = new Date(row.day);
      const key = this.toDayKey(date);
      byDay.set(key, {
        revenue: Number(row.revenue ?? 0),
        orders: Number(row.orders ?? 0),
      });
    }

    return Array.from({ length: 7 }).map((_, offset) => {
      const day = new Date(from);
      day.setDate(from.getDate() + offset);
      const key = this.toDayKey(day);
      const label = `${String(day.getDate()).padStart(2, '0')}/${String(
        day.getMonth() + 1,
      ).padStart(2, '0')}`;
      return {
        day: key,
        label,
        revenue: byDay.get(key)?.revenue ?? 0,
        orders: byDay.get(key)?.orders ?? 0,
      };
    });
  }

  private async getNewCustomersToday(range: DateRange): Promise<number> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.deleted_at IS NULL')
      .andWhere('user.role = :role', { role: UserRole.USER })
      .andWhere('user.created_at >= :from AND user.created_at < :to', range)
      .getCount();
  }

  private async getRecentOrders() {
    const rows = await this.ordersRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 6,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    });
    return rows.map((item) => ({
      id: item.id,
      totalAmount: item.totalAmount,
      status: item.status,
      paymentStatus: item.paymentStatus,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  private getDayRange(reference: Date): DateRange {
    const from = new Date(reference);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }

  private getCompareRange(
    todayRange: DateRange,
    compare: DashboardComparePreset,
  ): DateRange {
    const msInDay = 24 * 60 * 60 * 1000;
    if (compare === DashboardComparePreset.LAST_WEEK_SAME_DAY) {
      return {
        from: new Date(todayRange.from.getTime() - 7 * msInDay),
        to: new Date(todayRange.to.getTime() - 7 * msInDay),
      };
    }
    if (compare === DashboardComparePreset.AVG_LAST_7_DAYS) {
      return {
        from: new Date(todayRange.from.getTime() - 7 * msInDay),
        to: new Date(todayRange.from.getTime()),
      };
    }
    return {
      from: new Date(todayRange.from.getTime() - msInDay),
      to: new Date(todayRange.from.getTime()),
    };
  }

  private calculateDeltaPercent(current: number, baseline: number): number {
    if (baseline === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - baseline) / baseline) * 100).toFixed(2));
  }

  private toDayKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private getTrendStatus(deltaPercent: number): TrendStatus {
    if (deltaPercent >= 5) return 'GOOD';
    if (deltaPercent <= -5) return 'BAD';
    return 'NEUTRAL';
  }
}
