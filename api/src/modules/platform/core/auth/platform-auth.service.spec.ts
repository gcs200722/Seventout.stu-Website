import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from '../../../tenant/core/auth/entities/refresh-token.entity';
import {
  PlatformPermissionCode,
  UserRole,
} from '../../../tenant/core/authorization/authorization.types';
import { PermissionEntity } from '../../../tenant/core/authorization/entities/permission.entity';
import { UserEntity } from '../../../tenant/core/users/user.entity';
import { PlatformAuthService } from './platform-auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('PlatformAuthService', () => {
  let service: PlatformAuthService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let refreshTokensRepository: jest.Mocked<Repository<RefreshTokenEntity>>;
  let permissionsRepository: jest.Mocked<Repository<PermissionEntity>>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    usersRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    refreshTokensRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<RefreshTokenEntity>>;
    permissionsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<PermissionEntity>>;
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    const configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          PLATFORM_GOOGLE_SUCCESS_REDIRECT_URL: 'http://localhost:3000/platform/success',
          PLATFORM_GOOGLE_FAILURE_REDIRECT_URL: 'http://localhost:3000/platform/fail',
        };
        return map[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const map: Record<string, string | number> = {
          PASSWORD_SALT_ROUNDS: 10,
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_EXPIRES_IN: '10m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          GOOGLE_SUCCESS_REDIRECT_URL: 'http://localhost:3000/success',
          GOOGLE_FAILURE_REDIRECT_URL: 'http://localhost:3000/fail',
        };
        return map[key];
      }),
    } as unknown as ConfigService;

    service = new PlatformAuthService(
      usersRepository,
      refreshTokensRepository,
      permissionsRepository,
      jwtService,
      configService,
    );
  });

  it('should_login_admin_user', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'u1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      passwordHash: 'hash',
      permissions: [],
    } as unknown as UserEntity);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    refreshTokensRepository.create.mockReturnValue({
      id: 'rt1',
      userId: 'u1',
      tokenHash: '',
      tenantId: null,
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    } as RefreshTokenEntity);
    refreshTokensRepository.save
      .mockResolvedValueOnce({ id: 'rt1' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'rt1' } as RefreshTokenEntity);
    jwtService.signAsync
      .mockResolvedValueOnce('platform-access')
      .mockResolvedValueOnce('platform-refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const result = await service.login({
      email: 'admin@example.com',
      password: 'password123',
    });

    expect(result).toEqual({
      access_token: 'platform-access',
      refresh_token: 'platform-refresh',
    });
  });

  it('should_login_user_with_platform_tenant_read', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'u-op',
      email: 'operator@example.com',
      role: UserRole.USER,
      passwordHash: 'hash',
      permissions: [{ code: PlatformPermissionCode.PLATFORM_TENANT_READ }],
    } as unknown as UserEntity);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    refreshTokensRepository.create.mockReturnValue({
      id: 'rt-op',
      userId: 'u-op',
      tokenHash: '',
      tenantId: null,
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    } as RefreshTokenEntity);
    refreshTokensRepository.save
      .mockResolvedValueOnce({ id: 'rt-op' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'rt-op' } as RefreshTokenEntity);
    jwtService.signAsync
      .mockResolvedValueOnce('platform-access')
      .mockResolvedValueOnce('platform-refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const result = await service.login({
      email: 'operator@example.com',
      password: 'password123',
    });

    expect(result).toEqual({
      access_token: 'platform-access',
      refresh_token: 'platform-refresh',
    });
  });

  it('should_block_user_without_platform_access', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'u2',
      email: 'user@example.com',
      role: UserRole.USER,
      passwordHash: 'hash',
      permissions: [{ code: 'ORDER_MANAGE' }],
    } as unknown as UserEntity);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_register_platform_user', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    permissionsRepository.findOne.mockResolvedValue({
      code: PlatformPermissionCode.PLATFORM_TENANT_READ,
    } as PermissionEntity);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    usersRepository.create.mockReturnValue({ id: 'u3' } as UserEntity);
    usersRepository.save.mockResolvedValue({ id: 'u3' } as UserEntity);

    const result = await service.register({
      first_name: 'Platform',
      last_name: 'Operator',
      email: 'operator@example.com',
      password: 'password123',
      phone: '0326373527',
    });

    expect(result).toEqual({ user_id: 'u3' });
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: [{ code: PlatformPermissionCode.PLATFORM_TENANT_READ }],
      }),
    );
  });

  it('should_throw_when_register_but_platform_permission_missing', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    permissionsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.register({
        first_name: 'Platform',
        last_name: 'Operator',
        email: 'orphan@example.com',
        password: 'password123',
        phone: '0326373527',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('should_revoke_platform_refresh_tokens_on_logout', async () => {
    const qb = {
      update: jest.fn(),
      set: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    qb.update.mockReturnValue(qb);
    qb.set.mockReturnValue(qb);
    qb.where.mockReturnValue(qb);
    qb.andWhere.mockReturnValue(qb);
    refreshTokensRepository.createQueryBuilder.mockReturnValue(qb as never);

    await service.logout('user-uuid');

    expect(qb.update).toHaveBeenCalledWith(RefreshTokenEntity);
    expect(qb.set).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
    expect(qb.where).toHaveBeenCalledWith('user_id = :userId', { userId: 'user-uuid' });
    expect(qb.andWhere).toHaveBeenCalledWith('tenant_id IS NULL');
    expect(qb.andWhere).toHaveBeenCalledWith('revoked_at IS NULL');
    expect(qb.execute).toHaveBeenCalled();
  });

  it('should_throw_conflict_when_register_email_exists', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'u1' } as UserEntity);
    await expect(
      service.register({
        first_name: 'Platform',
        last_name: 'Operator',
        email: 'operator@example.com',
        password: 'password123',
        phone: '0326373527',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
