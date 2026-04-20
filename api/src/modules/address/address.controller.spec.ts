import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';

const allowGuard: CanActivate = { canActivate: () => true };

describe('AddressController', () => {
  let controller: AddressController;
  const addressService = {
    createAddress: jest.fn(),
    listAddresses: jest.fn(),
    getAddressById: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefaultAddress: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [{ provide: AddressService, useValue: addressService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(allowGuard)
      .compile();

    controller = module.get<AddressController>(AddressController);
  });

  it('POST /addresses returns data envelope', async () => {
    addressService.createAddress.mockResolvedValue({ id: 'a-1' });
    const result = await controller.createAddress(
      { id: 'u-1' } as never,
      { full_name: 'A' } as never,
    );
    expect(result).toEqual({ success: true, data: { id: 'a-1' } });
  });

  it('GET /addresses returns data envelope', async () => {
    addressService.listAddresses.mockResolvedValue([{ id: 'a-1' }]);
    const result = await controller.listAddresses(
      { id: 'u-1' } as never,
      {} as never,
    );
    expect(result).toEqual({ success: true, data: [{ id: 'a-1' }] });
  });

  it('PATCH /addresses/:id/set-default returns message', async () => {
    addressService.setDefaultAddress.mockResolvedValue(undefined);
    const result = await controller.setDefaultAddress(
      { id: 'u-1' } as never,
      'a-1',
    );
    expect(result.message).toBe('Address set as default successfully');
  });
});
