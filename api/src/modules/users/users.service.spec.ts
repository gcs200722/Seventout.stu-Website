import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { PermissionEntity } from '../authorization/entities/permission.entity';
import { UserEntity } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let permissionsRepository: jest.Mocked<Repository<PermissionEntity>>;

  beforeEach(() => {
    usersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    permissionsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<PermissionEntity>>;

    service = new UsersService(usersRepository, permissionsRepository);
  });

  it('should_return_user_list_when_list_users_called', async () => {
    usersRepository.find.mockResolvedValue([
      {
        id: 'u-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '0123',
        role: UserRole.USER,
        permissions: [],
      },
    ] as unknown as UserEntity[]);

    const result = await service.listUsers({ page: 1, limit: 10 });

    expect(result).toEqual([
      {
        id: 'u-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '0123',
        role: UserRole.USER,
        permissions: [],
      },
    ]);
    expect(usersRepository.find.mock.calls[0][0]).toEqual({
      order: { createdAt: 'DESC' },
      skip: 0,
      take: 10,
    });
  });

  it('should_return_user_detail_when_get_user_by_id_success', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'u-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '0123',
      role: UserRole.USER,
      permissions: [],
    } as unknown as UserEntity);

    const result = await service.getUserById('u-1');

    expect(result).toEqual({
      id: 'u-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '0123',
      role: UserRole.USER,
      permissions: [],
    });
  });

  it('should_throw_not_found_when_get_user_by_id_missing', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.getUserById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should_update_user_profile_when_update_user_called', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'u-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '0123',
      role: UserRole.USER,
      permissions: [],
    } as unknown as UserEntity);
    usersRepository.save.mockResolvedValue({} as UserEntity);

    await service.updateUser('u-1', {
      first_name: 'Lê',
      last_name: 'Thanh Tùng',
      phone: '0326373527',
    });

    expect(usersRepository.save.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        firstName: 'Lê',
        lastName: 'Thanh Tùng',
        phone: '0326373527',
      }),
    );
  });

  it('should_soft_delete_user_when_soft_delete_user_called', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'u-1',
    } as unknown as UserEntity);
    usersRepository.softDelete.mockResolvedValue({} as never);

    await service.softDeleteUser('u-1');

    expect(usersRepository.softDelete.mock.calls[0][0]).toBe('u-1');
  });

  it('should_update_role_when_update_user_role_called', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'u-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '0123',
      role: UserRole.USER,
      permissions: [],
    } as unknown as UserEntity);
    usersRepository.save.mockResolvedValue({} as UserEntity);
    permissionsRepository.find.mockResolvedValue([
      { code: PermissionCode.USER_READ } as PermissionEntity,
    ]);

    await service.updateUserRole('u-1', {
      role: UserRole.STAFF,
      permissions: [PermissionCode.USER_READ],
    });

    expect(usersRepository.save.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        role: UserRole.STAFF,
        permissions: [{ code: PermissionCode.USER_READ }],
      }),
    );
  });
});
