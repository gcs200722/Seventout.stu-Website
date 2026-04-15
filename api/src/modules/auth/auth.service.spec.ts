import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../authorization/authorization.types';
import { UserEntity } from '../users/user.entity';
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
      jwtService,
      configService,
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
  });

  it('should_revoke_active_tokens_when_logout', async () => {
    await service.logout('user-1');

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
});
