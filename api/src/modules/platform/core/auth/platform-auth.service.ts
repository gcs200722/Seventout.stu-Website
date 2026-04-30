import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from '../../../tenant/core/auth/entities/refresh-token.entity';
import {
  PlatformPermissionCode,
  UserRole,
} from '../../../tenant/core/authorization/authorization.types';
import {
  expiryDateFromNow,
  filterPermissionCodesByPrefix,
  parseJwtDurationToSeconds,
} from '../../../../common/auth/token-helpers.util';
import { PermissionEntity } from '../../../tenant/core/authorization/entities/permission.entity';
import { UserEntity } from '../../../tenant/core/users/user.entity';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformRefreshTokenDto } from './dto/platform-refresh-token.dto';
import { PlatformRegisterDto } from './dto/platform-register.dto';
import {
  PlatformGoogleOAuthProfile,
  PlatformGoogleOAuthStatePayload,
} from './google-auth.types';
import {
  PlatformAccessTokenPayload,
  PlatformRefreshTokenPayload,
} from './platform-auth.types';

@Injectable()
export class PlatformAuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionsRepository: Repository<PermissionEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(payload: PlatformLoginDto): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const user = await this.validatePlatformCredentials(payload.email, payload.password);
    return this.issueTokenPair(user);
  }

  async register(payload: PlatformRegisterDto): Promise<{ user_id: string }> {
    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const defaultPlatformPermission = await this.permissionsRepository.findOne({
      where: { code: PlatformPermissionCode.PLATFORM_TENANT_READ },
    });
    if (!defaultPlatformPermission) {
      throw new InternalServerErrorException(
        'PLATFORM_TENANT_READ permission is missing; run database migrations',
      );
    }

    const saltRounds = this.configService.getOrThrow<number>(
      'PASSWORD_SALT_ROUNDS',
    );
    const passwordHash = await bcrypt.hash(payload.password, saltRounds);
    const user = this.usersRepository.create({
      firstName: payload.first_name.trim(),
      lastName: payload.last_name.trim(),
      email,
      passwordHash,
      phone: payload.phone.trim(),
      role: UserRole.USER,
      permissions: [defaultPlatformPermission],
    });
    const createdUser = await this.usersRepository.save(user);
    return { user_id: createdUser.id };
  }

  /** Revokes platform-scoped refresh tokens (tenant_id IS NULL) for this user. */
  async logout(userId: string): Promise<void> {
    await this.refreshTokensRepository
      .createQueryBuilder()
      .update(RefreshTokenEntity)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('tenant_id IS NULL')
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async refreshToken(payload: PlatformRefreshTokenDto): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const verified = await this.verifyRefreshToken(payload.refresh_token);
    const tokenRecord = await this.refreshTokensRepository.findOne({
      where: { id: verified.tokenId, userId: verified.sub },
    });
    if (!tokenRecord || tokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    if (tokenRecord.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }
    const match = await bcrypt.compare(payload.refresh_token, tokenRecord.tokenHash);
    if (!match) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    tokenRecord.revokedAt = new Date();
    await this.refreshTokensRepository.save(tokenRecord);

    const user = await this.usersRepository.findOne({ where: { id: verified.sub } });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    this.assertPlatformAccess(user);
    return this.issueTokenPair(user);
  }

  async getMe(user: { id: string }): Promise<{
    id: string;
    email: string;
    role: UserRole;
    platform_permissions: PlatformPermissionCode[];
  }> {
    const foundUser = await this.usersRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      throw new UnauthorizedException('Invalid access token');
    }
    this.assertPlatformAccess(foundUser);
    return {
      id: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
      platform_permissions: this.extractPlatformPermissions(foundUser),
    };
  }

  async loginWithGoogle(profile: PlatformGoogleOAuthProfile): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const normalizedEmail = profile.email.trim().toLowerCase();
    const normalizedGoogleId = profile.googleId.trim();
    if (!normalizedGoogleId) {
      throw new UnauthorizedException('Invalid Google account');
    }

    let user = await this.usersRepository.findOne({
      where: { googleId: normalizedGoogleId },
    });
    if (!user) {
      user = await this.usersRepository.findOne({
        where: { email: normalizedEmail },
      });
    }
    if (!user) {
      user = this.usersRepository.create({
        email: normalizedEmail,
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: '0000000000',
        role: UserRole.USER,
        permissions: [],
      });
    }

    user.email = normalizedEmail;
    user.googleId = normalizedGoogleId;
    user.authProvider = 'google';
    user.firstName = user.firstName?.trim() || profile.firstName.trim();
    user.lastName = user.lastName?.trim() || profile.lastName.trim();

    const persistedUser = await this.usersRepository.save(user);
    this.assertPlatformAccess(persistedUser);
    return this.issueTokenPair(persistedUser);
  }

  createGoogleState(): string {
    const payload: PlatformGoogleOAuthStatePayload = {
      nonce: crypto.randomUUID(),
      type: 'platform_google_oauth_state',
    };
    return this.jwtService.sign(payload, {
      secret: this.getGoogleStateSecret(),
      expiresIn: '5m',
    });
  }

  assertGoogleState(state: string | undefined): void {
    if (!state || state.trim().length === 0) {
      throw new UnauthorizedException('Missing OAuth state');
    }
    try {
      const payload = this.jwtService.verify<PlatformGoogleOAuthStatePayload>(
        state,
        {
          secret: this.getGoogleStateSecret(),
        },
      );
      if (payload.type !== 'platform_google_oauth_state') {
        throw new UnauthorizedException('Invalid OAuth state');
      }
    } catch {
      throw new UnauthorizedException('Invalid OAuth state');
    }
  }

  buildGoogleSuccessRedirect(tokens: {
    access_token: string;
    refresh_token: string;
  }): string {
    const target =
      this.configService.get<string>('PLATFORM_GOOGLE_SUCCESS_REDIRECT_URL') ??
      this.configService.getOrThrow<string>('GOOGLE_SUCCESS_REDIRECT_URL');
    return this.buildRedirectUrl(target, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  }

  buildGoogleFailureRedirect(errorCode: string): string {
    const target =
      this.configService.get<string>('PLATFORM_GOOGLE_FAILURE_REDIRECT_URL') ??
      this.configService.getOrThrow<string>('GOOGLE_FAILURE_REDIRECT_URL');
    return this.buildRedirectUrl(target, { error: errorCode });
  }

  private async validatePlatformCredentials(
    email: string,
    password: string,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    this.assertPlatformAccess(user);
    return user;
  }

  private assertPlatformAccess(user: UserEntity): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    const platformPermissions = this.extractPlatformPermissions(user);
    if (platformPermissions.length === 0) {
      throw new UnauthorizedException('Platform access denied');
    }
  }

  private async issueTokenPair(user: UserEntity): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const refreshRecord = this.refreshTokensRepository.create({
      userId: user.id,
      tenantId: null,
      tokenHash: '',
      expiresAt: this.getRefreshTokenExpiryDate(),
      revokedAt: null,
    });
    const created = await this.refreshTokensRepository.save(refreshRecord);

    const accessPayload: PlatformAccessTokenPayload = {
      sub: user.id,
      user_id: user.id,
      email: user.email,
      role: user.role,
      platform_permissions: this.extractPlatformPermissions(user),
      token_scope: 'platform',
    };
    const refreshPayload: PlatformRefreshTokenPayload = {
      sub: user.id,
      tokenId: created.id,
      type: 'refresh',
      token_scope: 'platform',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.getExpiryInSeconds('JWT_ACCESS_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.getExpiryInSeconds('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    created.tokenHash = await bcrypt.hash(
      refreshToken,
      this.configService.getOrThrow<number>('PASSWORD_SALT_ROUNDS'),
    );
    await this.refreshTokensRepository.save(created);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<PlatformRefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<PlatformRefreshTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
      if (payload.type !== 'refresh' || payload.token_scope !== 'platform') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private getRefreshTokenExpiryDate(): Date {
    const refreshExpirySeconds = this.getExpiryInSeconds('JWT_REFRESH_EXPIRES_IN');
    return expiryDateFromNow(refreshExpirySeconds);
  }

  private getExpiryInSeconds(
    key: 'JWT_ACCESS_EXPIRES_IN' | 'JWT_REFRESH_EXPIRES_IN',
  ): number {
    const duration = this.configService.getOrThrow<string>(key);
    return parseJwtDurationToSeconds(duration, key);
  }

  private extractPlatformPermissions(
    user: Pick<UserEntity, 'permissions'>,
  ): PlatformPermissionCode[] {
    const permissions = user.permissions?.map((permission) => String(permission.code)) ?? [];
    return filterPermissionCodesByPrefix(
      permissions,
      'PLATFORM_',
    ) as PlatformPermissionCode[];
  }

  private getGoogleStateSecret(): string {
    const configuredSecret =
      this.configService.get<string>('GOOGLE_STATE_SECRET')?.trim() ?? '';
    if (configuredSecret.length > 0) {
      return configuredSecret;
    }
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private buildRedirectUrl(
    base: string,
    query: Record<string, string>,
  ): string {
    try {
      const url = new URL(base);
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return url.toString();
    } catch {
      throw new InternalServerErrorException(
        'Invalid OAuth redirect URL configuration',
      );
    }
  }
}
