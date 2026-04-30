import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PermissionEntity } from '../authorization/entities/permission.entity';
import { Repository } from 'typeorm';
import { UserRole } from '../authorization/authorization.types';
import { UserEntity } from '../users/user.entity';
import { AdminBootstrapService } from './admin-bootstrap.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('AdminBootstrapService', () => {
  let service: AdminBootstrapService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let permissionsRepository: jest.Mocked<Repository<PermissionEntity>>;
  let configService: jest.Mocked<ConfigService>;
  let findOneMock: jest.Mock;
  let saveMock: jest.Mock;
  let createMock: jest.Mock;

  beforeEach(() => {
    findOneMock = jest.fn();
    saveMock = jest.fn();
    createMock = jest.fn();

    usersRepository = {
      findOne: findOneMock,
      save: saveMock,
      create: createMock,
    } as unknown as jest.Mocked<Repository<UserEntity>>;

    permissionsRepository = {
      find: jest.fn().mockResolvedValue([
        { code: 'PLATFORM_TENANT_READ' },
        { code: 'PLATFORM_TENANT_MANAGE' },
      ]),
    } as unknown as jest.Mocked<Repository<PermissionEntity>>;

    configService = {
      get: jest.fn((key: string, fallback?: string) => fallback ?? key),
      getOrThrow: jest.fn((key: string) => {
        const map: Record<string, string | number> = {
          DEFAULT_ADMIN_EMAIL: 'admin@example.com',
          DEFAULT_ADMIN_PASSWORD: 'Admin@123',
          PASSWORD_SALT_ROUNDS: 10,
        };
        return map[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new AdminBootstrapService(
      usersRepository,
      permissionsRepository,
      configService,
    );
  });

  it('should_skip_bootstrap_when_admin_exists', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: 'admin-1',
      role: UserRole.ADMIN,
    } as UserEntity);

    await service.onModuleInit();

    expect(saveMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should_promote_existing_email_user_when_admin_missing', async () => {
    usersRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@example.com',
    } as UserEntity);
    usersRepository.save.mockResolvedValue({} as UserEntity);

    await service.onModuleInit();

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        role: UserRole.ADMIN,
      }),
    );
  });

  it('should_create_default_admin_when_not_exists', async () => {
    usersRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    usersRepository.create.mockReturnValue({ id: 'admin-new' } as UserEntity);
    usersRepository.save.mockResolvedValue({ id: 'admin-new' } as UserEntity);

    await service.onModuleInit();

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      }),
    );
    expect(saveMock).toHaveBeenCalled();
  });
});
