import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { OrderEntity } from '../orders/entities/order.entity';
import { AddressService } from './address.service';
import { AddressEntity } from './entities/address.entity';

describe('AddressService', () => {
  let service: AddressService;
  let addressesRepository: jest.Mocked<Repository<AddressEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let dataSource: jest.Mocked<DataSource>;

  const user: AuthenticatedUser = {
    id: 'u-1',
    email: 'u@example.com',
    role: UserRole.USER,
    permissions: [],
  };

  beforeEach(() => {
    addressesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    } as never;
    ordersRepository = {
      exist: jest.fn(),
    } as never;
    dataSource = {
      transaction: jest.fn(),
    } as never;

    service = new AddressService(
      addressesRepository,
      ordersRepository,
      dataSource,
    );
  });

  it('creates default address and unsets previous default', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const save = jest.fn().mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      addressLine: '123 Le Loi',
      ward: 'Ben Nghe',
      district: 'District 1',
      city: 'Ho Chi Minh',
      country: 'Vietnam',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: Record<string, unknown>) => Promise<unknown>) =>
        cb({
          getRepository: () => ({
            update,
            save,
            create: (payload: unknown) => payload,
          }),
        }),
    );

    const result = await service.createAddress(user, {
      full_name: 'Nguyen Van A',
      phone: '0901234567',
      address_line: '123 Le Loi',
      ward: 'Ben Nghe',
      district: 'District 1',
      city: 'Ho Chi Minh',
      country: 'Vietnam',
      is_default: true,
    });

    expect(update).toHaveBeenCalled();
    expect(result.is_default).toBe(true);
  });

  it('blocks USER from reading another owner address', async () => {
    addressesRepository.findOne.mockResolvedValue({
      id: 'a-1',
      userId: 'u-2',
    } as AddressEntity);

    await expect(service.getAddressById(user, 'a-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('blocks delete when address is used by active orders', async () => {
    addressesRepository.findOne.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
    } as AddressEntity);
    ordersRepository.exist.mockResolvedValue(true);

    await expect(service.deleteAddress(user, 'a-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws not found when address does not exist', async () => {
    addressesRepository.findOne.mockResolvedValue(null);
    await expect(service.getAddressById(user, 'a-missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
