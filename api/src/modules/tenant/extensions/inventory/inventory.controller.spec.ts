import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryWebhookService } from './inventory-webhook.service';

const allowGuard: CanActivate = { canActivate: () => true };

const actor: AuthenticatedUser = {
  id: 'u1',
  email: 'a@test.com',
  role: UserRole.ADMIN,
  permissions: [],
};

describe('InventoryController', () => {
  let controller: InventoryController;
  const inventoryService = {
    listInventory: jest.fn(),
    listMovements: jest.fn(),
    getInventoryByProductId: jest.fn(),
    adjustInventory: jest.fn(),
    requestSync: jest.fn(),
  };
  const inventoryWebhookService = {
    receiveWebhook: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: InventoryWebhookService, useValue: inventoryWebhookService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(allowGuard)
      .compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('GET inventory returns data and pagination', async () => {
    inventoryService.listInventory.mockResolvedValue({
      items: [{ product_id: 'p-1' }],
      total: 1,
    });
    const result = await controller.listInventory({
      page: 1,
      limit: 10,
    } as never);
    expect(result).toEqual({
      success: true,
      data: [{ product_id: 'p-1' }],
      pagination: { page: 1, limit: 10, total: 1 },
    });
  });

  it('GET movements returns data and pagination', async () => {
    inventoryService.listMovements.mockResolvedValue({
      items: [{ id: 'm-1' }],
      total: 1,
    });
    const result = await controller.listMovements({
      page: 1,
      limit: 10,
    } as never);
    expect(result.pagination.total).toBe(1);
  });

  it('GET product inventory returns envelope', async () => {
    inventoryService.getInventoryByProductId.mockResolvedValue({
      product_id: 'p-1',
      channels: [],
    });
    const result = await controller.getProductInventory('p-1');
    expect(result).toEqual({
      success: true,
      data: { product_id: 'p-1', channels: [] },
    });
  });

  it('PATCH adjust delegates and returns message', async () => {
    inventoryService.adjustInventory.mockResolvedValue(undefined);
    const result = await controller.adjustInventory(actor, 'p-1', {
      channel: 'internal',
      type: 'IN',
      quantity: 3,
      reason: 'Import',
    } as never);
    expect(result.message).toBe('Inventory adjusted successfully');
    expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
      'p-1',
      expect.any(Object),
      actor,
    );
  });

  it('POST sync delegates and returns message', async () => {
    inventoryService.requestSync.mockResolvedValue(undefined);
    const result = await controller.syncInventory(actor, {
      product_id: 'p-1',
      channel: 'shopee',
    } as never);
    expect(inventoryService.requestSync).toHaveBeenCalledWith(
      { product_id: 'p-1', channel: 'shopee' },
      actor,
    );
    expect(result).toEqual({
      success: true,
      message: 'Inventory synced successfully',
    });
  });

  it('POST webhook delegates and returns accepted message', async () => {
    inventoryWebhookService.receiveWebhook.mockResolvedValue(undefined);
    const result = await controller.receiveWebhook(
      'shopee' as never,
      {
        event_id: 'ev-1',
        event_type: 'inventory.updated',
        payload: {},
      } as never,
      'sig-1',
    );
    expect(result.message).toBe('Webhook accepted');
  });
});
