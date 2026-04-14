import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
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

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;

    refreshTokensRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }),
    } as unknown as jest.Mocked<Repository<RefreshTokenEntity>>;

    jwtService = {
      signAsync: jest.fn(),
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

  it('throws on duplicate email during register', async () => {
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

  it('throws on invalid password during login', async () => {
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

  it('throws when refresh token is revoked', async () => {
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
});
