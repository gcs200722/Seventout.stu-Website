import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

const allowGuard: CanActivate = { canActivate: () => true };

describe('CartController', () => {
  let controller: CartController;
  const cartService = {
    getCurrentCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    validateCart: jest.fn(),
    checkout: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: cartService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(allowGuard)
      .compile();

    controller = module.get<CartController>(CartController);
  });

  it('GET cart returns envelope', async () => {
    cartService.getCurrentCart.mockResolvedValue({ cart_id: 'c-1', items: [] });
    const result = await controller.getCurrentCart({ id: 'u-1' } as never);
    expect(result).toEqual({
      success: true,
      data: { cart_id: 'c-1', items: [] },
    });
  });

  it('POST items returns message', async () => {
    cartService.addItem.mockResolvedValue(undefined);
    const result = await controller.addItem(
      { id: 'u-1' } as never,
      { product_id: 'p-1', quantity: 1 } as never,
    );
    expect(result.message).toBe('Cart item added successfully');
  });

  it('PATCH items returns message', async () => {
    cartService.updateItem.mockResolvedValue(undefined);
    const result = await controller.updateItem(
      { id: 'u-1' } as never,
      'item-1',
      { quantity: 3 } as never,
    );
    expect(result).toEqual({
      success: true,
      message: 'Cart item updated successfully',
    });
  });

  it('DELETE items returns message', async () => {
    cartService.removeItem.mockResolvedValue(undefined);
    const result = await controller.deleteItem(
      { id: 'u-1' } as never,
      'item-1',
    );
    expect(result).toEqual({
      success: true,
      message: 'Cart item removed successfully',
    });
  });

  it('DELETE clear returns message', async () => {
    cartService.clearCart.mockResolvedValue(undefined);
    const result = await controller.clear({ id: 'u-1' } as never);
    expect(result).toEqual({
      success: true,
      message: 'Cart cleared successfully',
    });
  });

  it('POST validate returns data', async () => {
    cartService.validateCart.mockResolvedValue({ valid: true, issues: [] });
    const result = await controller.validate({ id: 'u-1' } as never);
    expect(result).toEqual({
      success: true,
      data: { valid: true, issues: [] },
    });
  });

  it('POST checkout returns data envelope', async () => {
    cartService.checkout.mockResolvedValue({ reserved_items: 2 });
    const result = await controller.checkout(
      { id: 'u-1' } as never,
      { idempotency_key: 'k-1' } as never,
    );
    expect(result).toEqual({
      success: true,
      data: { reserved_items: 2 },
    });
  });
});
