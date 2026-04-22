import { Repository } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/orders.types';
import { RefundEntity } from '../refunds/entities/refund.entity';
import { ReturnEntity } from '../returns/entities/return.entity';
import { UserEntity } from '../users/user.entity';
import { DashboardService } from './dashboard.service';
import { DashboardComparePreset } from './dto/get-dashboard-summary.query.dto';

type QueryBuilderMock = {
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  setParameters: jest.Mock;
  getRawOne: jest.Mock;
  getCount: jest.Mock;
  getRawMany: jest.Mock;
};

const buildQueryBuilderMock = (): QueryBuilderMock => {
  const builder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    setParameters: jest.fn(),
    getRawOne: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.addSelect.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.groupBy.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.setParameters.mockReturnValue(builder);
  return builder;
};

describe('DashboardService', () => {
  let service: DashboardService;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let returnsRepository: jest.Mocked<Repository<ReturnEntity>>;
  let refundsRepository: jest.Mocked<Repository<RefundEntity>>;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;

  beforeEach(() => {
    ordersRepository = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderEntity>>;
    returnsRepository = {
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<ReturnEntity>>;
    refundsRepository = {
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<RefundEntity>>;
    usersRepository = {
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    service = new DashboardService(
      ordersRepository,
      returnsRepository,
      refundsRepository,
      usersRepository,
    );
  });

  it('should_return_summary_with_good_revenue_trend_when_today_is_higher', async () => {
    const ordersTodayQb = buildQueryBuilderMock();
    const ordersCompareQb = buildQueryBuilderMock();
    const pendingOrdersQb = buildQueryBuilderMock();
    const breakdownQb = buildQueryBuilderMock();
    const hourlyOrdersQb = buildQueryBuilderMock();
    const revenue7dQb = buildQueryBuilderMock();
    const returnsIssueQb = buildQueryBuilderMock();
    const refundsIssueQb = buildQueryBuilderMock();
    const newCustomersQb = buildQueryBuilderMock();
    const newCustomersHourlyQb = buildQueryBuilderMock();

    ordersTodayQb.getRawOne.mockResolvedValue({
      gross_revenue: '1000000',
      paid_orders: '4',
    });
    ordersCompareQb.getRawOne.mockResolvedValue({
      gross_revenue: '500000',
      paid_orders: '2',
    });
    pendingOrdersQb.getCount.mockResolvedValue(3);
    breakdownQb.getRawMany.mockResolvedValue([
      { status: 'CONFIRMED', count: '2' },
      { status: 'COMPLETED', count: '4' },
    ]);
    hourlyOrdersQb.getRawMany.mockResolvedValue([
      { hour: '9', revenue: '300000', orders: '1' },
    ]);
    revenue7dQb.getRawMany.mockResolvedValue([
      { day: new Date().toISOString(), revenue: '1200000', orders: '5' },
    ]);
    returnsIssueQb.getCount.mockResolvedValue(2);
    refundsIssueQb.getCount.mockResolvedValue(1);
    newCustomersQb.getCount.mockResolvedValue(6);
    newCustomersHourlyQb.getRawMany.mockResolvedValue([
      { hour: '8', count: '2' },
    ]);

    ordersRepository.createQueryBuilder
      .mockReturnValueOnce(ordersTodayQb as never)
      .mockReturnValueOnce(ordersCompareQb as never)
      .mockReturnValueOnce(pendingOrdersQb as never)
      .mockReturnValueOnce(breakdownQb as never)
      .mockReturnValueOnce(hourlyOrdersQb as never)
      .mockReturnValueOnce(revenue7dQb as never);
    ordersRepository.find.mockResolvedValue([
      {
        id: 'ord-1',
        totalAmount: 900000,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        createdAt: new Date(),
      },
    ]);
    returnsRepository.createQueryBuilder.mockReturnValue(
      returnsIssueQb as never,
    );
    refundsRepository.createQueryBuilder.mockReturnValue(
      refundsIssueQb as never,
    );
    usersRepository.createQueryBuilder
      .mockReturnValueOnce(newCustomersQb as never)
      .mockReturnValueOnce(newCustomersHourlyQb as never);

    const result = await service.getSummary(DashboardComparePreset.YESTERDAY);

    expect(result.today.metrics.grossRevenue).toBe(1000000);
    expect(result.trend.revenueStatus).toBe('GOOD');
    expect(result.trend.revenueDeltaPercent).toBe(100);
    expect(result.issues.pendingOrdersTooLong).toBe(3);
    expect(
      result.orderStatusBreakdown.find(
        (item) => item.status === OrderStatus.COMPLETED,
      )?.count,
    ).toBe(4);
    expect(result.today.metrics.newCustomers).toBe(6);
    expect(result.statusDonut.length).toBeGreaterThan(0);
    expect(result.recentOrders).toHaveLength(1);
    expect(result.actionQueue).toHaveLength(3);
  });
});
