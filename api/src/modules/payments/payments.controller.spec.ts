import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

const allowGuard: CanActivate = { canActivate: () => true };

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const paymentsService = {
    createPayment: jest.fn(),
    getPaymentById: jest.fn(),
    listPayments: jest.fn(),
    confirmPayment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(allowGuard)
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('POST /payments returns data envelope', async () => {
    paymentsService.createPayment.mockResolvedValue({ payment_id: 'p-1' });
    const result = await controller.createPayment(
      { id: 'u-1' } as never,
      { order_id: 'o-1', payment_method: 'COD' } as never,
      'idmp',
    );
    expect(result).toEqual({ success: true, data: { payment_id: 'p-1' } });
  });

  it('GET /payments/:id returns detail envelope', async () => {
    paymentsService.getPaymentById.mockResolvedValue({ id: 'p-1' });
    const result = await controller.getPaymentById(
      { id: 'u-1' } as never,
      'p-1',
    );
    expect(result).toEqual({ success: true, data: { id: 'p-1' } });
  });

  it('GET /payments returns pagination envelope', async () => {
    paymentsService.listPayments.mockResolvedValue({ items: [], total: 0 });
    const result = await controller.listPayments({
      page: 1,
      limit: 10,
    } as never);
    expect(result.pagination.total).toBe(0);
  });

  it('POST /payments/:id/confirm returns data envelope', async () => {
    paymentsService.confirmPayment.mockResolvedValue({
      payment_id: 'p-1',
      status: 'SUCCESS',
    });
    const result = await controller.confirmPayment('p-1', {
      status: 'SUCCESS',
    } as never);
    expect(result).toEqual({
      success: true,
      data: { payment_id: 'p-1', status: 'SUCCESS' },
    });
  });
});
