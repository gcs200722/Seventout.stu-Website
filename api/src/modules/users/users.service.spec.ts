import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserRole } from '../authorization/authorization.types';
import { UserEntity } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;

  beforeEach(() => {
    usersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;

    service = new UsersService(usersRepository);
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
      },
    ] as UserEntity[]);

    const result = await service.listUsers();

    expect(result).toEqual([
      {
        id: 'u-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '0123',
        role: UserRole.USER,
      },
    ]);
  });

  it('should_return_user_detail_when_get_user_by_id_success', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'u-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '0123',
      role: UserRole.USER,
    } as UserEntity);

    const result = await service.getUserById('u-1');

    expect(result).toEqual({
      id: 'u-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '0123',
      role: UserRole.USER,
    });
  });

  it('should_throw_not_found_when_get_user_by_id_missing', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.getUserById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
