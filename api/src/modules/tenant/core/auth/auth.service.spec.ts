import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../authorization/authorization.types';
import {
  TenantMembershipEntity,
  TenantMembershipRole,
  TenantMembershipStatus,
} from '../memberships/entities/tenant-membership.entity';
import { UserEntity } from '../users/user.entity';
import type { AuditWriterService } from '../audit/audit-writer.service';
import { AuthService } from './auth.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let refreshTokensRepository: jest.Mocked<Repository<RefreshTokenEntity>>;
  let jwtService: jest.Mocked<JwtService>;
  let membershipsRepository: jest.Mocked<Repository<TenantMembershipEntity>>;
  let auditWriter: jest.Mocked<Pick<AuditWriterService, 'log'>>;
  let usersCreateMock: jest.Mock;
  let refreshCreateQueryBuilderMock: jest.Mock;
  let jwtSignAsyncMock: jest.Mock;
  let queryBuilderMock: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };

  beforeEach(() => {
    usersCreateMock = jest.fn();
    refreshCreateQueryBuilderMock = jest.fn();
    jwtSignAsyncMock = jest.fn();

    queryBuilderMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    usersRepository = {
      findOne: jest.fn(),
      create: usersCreateMock,
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;

    refreshTokensRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder:
        refreshCreateQueryBuilderMock.mockReturnValue(queryBuilderMock),
    } as unknown as jest.Mocked<Repository<RefreshTokenEntity>>;

    jwtService = {
      signAsync: jwtSignAsyncMock,
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    membershipsRepository = {
      find: jest.fn().mockResolvedValue([
        {
          userId: 'user-1',
          tenantId: 'tenant-default',
          role: TenantMembershipRole.STAFF,
          status: TenantMembershipStatus.ACTIVE,
        },
      ]),
    } as unknown as jest.Mocked<Repository<TenantMembershipEntity>>;

    auditWriter = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const envMap = {
      PASSWORD_SALT_ROUNDS: 10,
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '10m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    } as const;
    type EnvKey = keyof typeof envMap;
    const configService = {
      getOrThrow: jest.fn((key: EnvKey) => envMap[key]),
    } as unknown as ConfigService;

    service = new AuthService(
      usersRepository,
      refreshTokensRepository,
      membershipsRepository,
      jwtService,
      configService,
      auditWriter as unknown as AuditWriterService,
    );
  });

  it('should_throw_conflict_when_register_email_exists', async () => {
    usersRepository.findOne.mockResolvedValue({ id: '1' } as UserEntity);

    await expect(
      service.register({
        first_name: 'A',
        last_name: 'B',
        email: 'a@example.com',
        password: 'password123',
        phone: '0326373527',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should_create_user_when_register_success', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    usersRepository.create.mockReturnValue({
      id: 'user-1',
    } as UserEntity);
    usersRepository.save.mockResolvedValue({ id: 'user-1' } as UserEntity);

    const result = await service.register({
      first_name: '  John',
      last_name: '  Doe',
      email: 'JOHN@EXAMPLE.COM ',
      password: 'password123',
      phone: ' 0123456789 ',
    });

    expect(result).toEqual({ user_id: 'user-1' });
    expect(usersCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '0123456789',
        role: UserRole.USER,
      }),
    );
  });

  it('should_throw_error_when_password_invalid', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      passwordHash: 'hashed',
    } as UserEntity);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({
        email: 'john@example.com',
        password: 'invalid',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_return_token_pair_when_login_success', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      passwordHash: 'hashed',
      role: UserRole.USER,
      permissions: [],
    } as unknown as UserEntity);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    refreshTokensRepository.create.mockReturnValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: '',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    } as RefreshTokenEntity);
    refreshTokensRepository.save
      .mockResolvedValueOnce({ id: 'token-1' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'token-1' } as RefreshTokenEntity);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('refresh-hash');

    const result = await service.login({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result).toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(jwtSignAsyncMock).toHaveBeenCalledTimes(2);
    expect(auditWriter.log).toHaveBeenCalled();
  });

  it('should_revoke_active_tokens_when_logout', async () => {
    await service.logout({
      id: 'user-1',
      email: 'u@e.com',
      role: UserRole.USER,
      permissions: [],
    });

    expect(refreshCreateQueryBuilderMock).toHaveBeenCalled();
    expect(queryBuilderMock.where).toHaveBeenCalledWith('user_id = :userId', {
      userId: 'user-1',
    });
    expect(queryBuilderMock.execute).toHaveBeenCalled();
  });

  it('should_return_profile_when_get_me_success', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '0123',
    } as UserEntity);

    const result = await service.getMe({
      id: 'user-1',
      email: 'john@example.com',
      role: UserRole.USER,
      permissions: [],
    });

    expect(result).toEqual({
      id: 'user-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '0123',
    });
  });

  it('should_throw_error_when_get_me_user_not_found', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.getMe({
        id: 'user-1',
        email: 'john@example.com',
        role: UserRole.USER,
        permissions: [],
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_change_password_and_revoke_tokens_when_valid', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      passwordHash: 'old-hash',
    } as UserEntity);
    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    usersRepository.save.mockResolvedValue({} as UserEntity);

    await service.changePassword(
      {
        id: 'user-1',
        email: 'john@example.com',
        role: UserRole.USER,
        permissions: [],
      },
      {
        current_password: 'oldPassword123',
        new_password: 'newPassword123',
      },
    );

    expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
    expect(refreshCreateQueryBuilderMock).toHaveBeenCalled();
    expect(auditWriter.log).toHaveBeenCalled();
  });

  it('should_throw_error_when_new_password_same_as_current', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      passwordHash: 'old-hash',
    } as UserEntity);
    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      service.changePassword(
        {
          id: 'user-1',
          email: 'john@example.com',
          role: UserRole.USER,
          permissions: [],
        },
        {
          current_password: 'oldPassword123',
          new_password: 'oldPassword123',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_throw_error_when_refresh_token_revoked', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      tokenId: 'token-1',
      type: 'refresh',
    });
    refreshTokensRepository.findOne.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 10000),
      tokenHash: 'hash',
    } as RefreshTokenEntity);

    await expect(
      service.refreshToken({ refresh_token: 'refresh-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_throw_error_when_refresh_token_expired', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      tokenId: 'token-1',
      type: 'refresh',
    });
    refreshTokensRepository.findOne.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 10000),
      tokenHash: 'hash',
    } as RefreshTokenEntity);

    await expect(
      service.refreshToken({ refresh_token: 'refresh-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_throw_error_when_refresh_token_hash_not_match', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      tokenId: 'token-1',
      type: 'refresh',
    });
    refreshTokensRepository.findOne.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      tokenHash: 'hash',
    } as RefreshTokenEntity);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.refreshToken({ refresh_token: 'refresh-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_throw_error_when_refresh_payload_type_invalid', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      tokenId: 'token-1',
      type: 'access',
    });

    await expect(
      service.refreshToken({ refresh_token: 'refresh-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_throw_error_when_refresh_user_not_found', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      tokenId: 'token-1',
      type: 'refresh',
    });
    refreshTokensRepository.findOne.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      tokenHash: 'hash',
    } as RefreshTokenEntity);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    refreshTokensRepository.save.mockResolvedValue({} as RefreshTokenEntity);
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.refreshToken({ refresh_token: 'refresh-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_return_token_pair_when_refresh_success', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      tokenId: 'token-1',
      type: 'refresh',
    });
    refreshTokensRepository.findOne.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      tokenHash: 'hash',
    } as RefreshTokenEntity);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      role: UserRole.STAFF,
      permissions: [{ code: 'ORDER_MANAGE' }],
    } as unknown as UserEntity);
    refreshTokensRepository.create.mockReturnValue({
      id: 'token-2',
      userId: 'user-1',
      tokenHash: '',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    } as RefreshTokenEntity);
    refreshTokensRepository.save
      .mockResolvedValueOnce({ id: 'token-1' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'token-2' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'token-2' } as RefreshTokenEntity);
    jwtService.signAsync
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    const result = await service.refreshToken({
      refresh_token: 'refresh-token',
    });

    expect(result).toEqual({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });
  });

  it('should_login_google_user_when_google_id_already_linked', async () => {
    usersRepository.findOne
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'john@example.com',
        role: UserRole.USER,
        permissions: [],
        googleId: 'google-1',
        authProvider: 'google',
      } as unknown as UserEntity)
      .mockResolvedValueOnce(null);

    refreshTokensRepository.create.mockReturnValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: '',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    } as RefreshTokenEntity);
    refreshTokensRepository.save
      .mockResolvedValueOnce({ id: 'token-1' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'token-1' } as RefreshTokenEntity);
    usersRepository.save.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      role: UserRole.USER,
      permissions: [],
      googleId: 'google-1',
      authProvider: 'google',
      firstName: 'John',
      lastName: 'Doe',
    } as unknown as UserEntity);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('refresh-hash');

    const result = await service.loginWithGoogle({
      googleId: 'google-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(result).toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(usersRepository.save.mock.calls.length).toBeGreaterThan(0);
  });

  it('should_auto_link_google_when_email_exists', async () => {
    usersRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'user-2',
      email: 'legacy@example.com',
      role: UserRole.USER,
      permissions: [],
      googleId: null,
      authProvider: 'local',
      firstName: 'Legacy',
      lastName: 'User',
    } as unknown as UserEntity);

    refreshTokensRepository.create.mockReturnValue({
      id: 'token-2',
      userId: 'user-2',
      tokenHash: '',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    } as RefreshTokenEntity);
    refreshTokensRepository.save
      .mockResolvedValueOnce({ id: 'token-2' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'token-2' } as RefreshTokenEntity);
    usersRepository.save.mockResolvedValue({
      id: 'user-2',
      email: 'legacy@example.com',
      role: UserRole.USER,
      permissions: [],
      googleId: 'google-2',
      authProvider: 'google',
      firstName: 'Legacy',
      lastName: 'User',
    } as unknown as UserEntity);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token-2')
      .mockResolvedValueOnce('refresh-token-2');
    (bcrypt.hash as jest.Mock).mockResolvedValue('refresh-hash-2');

    await service.loginWithGoogle({
      googleId: 'google-2',
      email: 'legacy@example.com',
      firstName: 'New',
      lastName: 'Name',
    });

    expect(usersRepository.save.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        id: 'user-2',
        googleId: 'google-2',
        authProvider: 'google',
      }),
    );
  });

  it('should_create_new_user_when_google_email_not_found', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.create.mockReturnValue({
      id: 'user-3',
      email: 'new@example.com',
      role: UserRole.USER,
      permissions: [],
      googleId: null,
      authProvider: 'local',
      firstName: 'New',
      lastName: 'User',
      phone: '0000000000',
    } as unknown as UserEntity);
    usersRepository.save.mockResolvedValueOnce({
      id: 'user-3',
      email: 'new@example.com',
      role: UserRole.USER,
      permissions: [],
      googleId: 'google-3',
      authProvider: 'google',
      firstName: 'New',
      lastName: 'User',
      phone: '0000000000',
    } as unknown as UserEntity);

    refreshTokensRepository.create.mockReturnValue({
      id: 'token-3',
      userId: 'user-3',
      tokenHash: '',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    } as RefreshTokenEntity);
    refreshTokensRepository.save
      .mockResolvedValueOnce({ id: 'token-3' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'token-3' } as RefreshTokenEntity);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token-3')
      .mockResolvedValueOnce('refresh-token-3');
    (bcrypt.hash as jest.Mock).mockResolvedValue('refresh-hash-3');

    const result = await service.loginWithGoogle({
      googleId: 'google-3',
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
    });

    expect(result.access_token).toBe('access-token-3');
    expect(usersRepository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        email: 'new@example.com',
      }),
    );
  });

  it('should_throw_when_switch_tenant_without_membership', async () => {
    membershipsRepository.find.mockResolvedValueOnce([]);
    await expect(
      service.switchTenant(
        {
          id: 'user-1',
          email: 'john@example.com',
          role: UserRole.USER,
          permissions: [],
        },
        'tenant-2',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should_issue_new_tokens_when_switch_tenant_success', async () => {
    membershipsRepository.find.mockResolvedValueOnce([
      {
        userId: 'user-1',
        tenantId: 'tenant-2',
        role: TenantMembershipRole.ADMIN,
        status: TenantMembershipStatus.ACTIVE,
      } as TenantMembershipEntity,
    ]);
    usersRepository.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'john@example.com',
      role: UserRole.ADMIN,
      permissions: [],
    } as unknown as UserEntity);
    refreshTokensRepository.create.mockReturnValue({
      id: 'token-switch',
      userId: 'user-1',
      tenantId: 'tenant-2',
      tokenHash: '',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
    } as RefreshTokenEntity);
    refreshTokensRepository.save
      .mockResolvedValueOnce({ id: 'token-switch' } as RefreshTokenEntity)
      .mockResolvedValueOnce({ id: 'token-switch' } as RefreshTokenEntity);
    jwtService.signAsync
      .mockResolvedValueOnce('switch-access')
      .mockResolvedValueOnce('switch-refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('switch-hash');

    const result = await service.switchTenant(
      {
        id: 'user-1',
        email: 'john@example.com',
        role: UserRole.ADMIN,
        permissions: [],
      },
      'tenant-2',
    );
    expect(result).toEqual({
      access_token: 'switch-access',
      refresh_token: 'switch-refresh',
    });
  });
});
