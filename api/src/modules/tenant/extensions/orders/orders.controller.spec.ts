import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const allowGuard: CanActivate = { canActivate: () => true };

describe('OrdersController', () => {
  let controller: OrdersController;
  const ordersService = {
    createOrder: jest.fn(),
    listOrders: jest.fn(),
    getOrderById: jest.fn(),
    cancelOrder: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(allowGuard)
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('POST /orders returns data envelope', async () => {
    ordersService.createOrder.mockResolvedValue({ order_id: 'o-1' });
    const result = await controller.createOrder(
      { id: 'u-1' } as never,
      { cart_id: 'c-1', address_id: 'a-1' } as never,
      'idmp',
    );
    expect(result).toEqual({ success: true, data: { order_id: 'o-1' } });
  });

  it('GET /orders returns pagination envelope', async () => {
    ordersService.listOrders.mockResolvedValue({ items: [], total: 0 });
    const result = await controller.getOrders(
      { id: 'u-1' } as never,
      { page: 1, limit: 10 } as never,
    );
    expect(result.pagination.total).toBe(0);
  });

  it('GET /orders/:id returns detail envelope', async () => {
    ordersService.getOrderById.mockResolvedValue({ id: 'o-1' });
    const result = await controller.getOrderById({ id: 'u-1' } as never, 'o-1');
    expect(result).toEqual({ success: true, data: { id: 'o-1' } });
  });

  it('PATCH /orders/:id/cancel returns message', async () => {
    ordersService.cancelOrder.mockResolvedValue(undefined);
    const result = await controller.cancelOrder({ id: 'u-1' } as never, 'o-1');
    expect(result.message).toBe('Order canceled successfully');
  });

  it('PATCH /orders/:id/status returns data envelope', async () => {
    ordersService.updateStatus.mockResolvedValue({ status: 'COMPLETED' });
    const result = await controller.updateOrderStatus(
      { id: 'staff-1' } as never,
      'o-1',
      {
        status: 'COMPLETED',
      } as never,
    );
    expect(result).toEqual({ success: true, data: { status: 'COMPLETED' } });
  });
});
