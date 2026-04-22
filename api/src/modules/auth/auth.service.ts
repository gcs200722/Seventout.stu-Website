import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { Repository } from 'typeorm';
import { UserRole } from '../authorization/authorization.types';
import { UserEntity } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
} from './auth.types';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';
import { AuditWriterService } from '../audit/audit-writer.service';
import {
  GoogleOAuthProfile,
  GoogleOAuthStatePayload,
} from './google-auth.types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user_id: string }> {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const saltRounds = this.configService.getOrThrow<number>(
      'PASSWORD_SALT_ROUNDS',
    );
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    const user = this.usersRepository.create({
      firstName: registerDto.first_name.trim(),
      lastName: registerDto.last_name.trim(),
      email,
      passwordHash,
      phone: registerDto.phone.trim(),
      role: UserRole.USER,
      permissions: [],
    });
    const createdUser = await this.usersRepository.save(user);
    return { user_id: createdUser.id };
  }

  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const user = await this.validateCredentials(
      loginDto.email,
      loginDto.password,
    );
    const tokens = await this.issueTokenPair(user);
    await this.auditWriter.log({
      action: AuditAction.LOGIN,
      entityType: AuditEntityType.AUTH,
      entityId: user.id,
      actor: this.toAuditActor(user),
      entityLabel: user.email,
      metadata: {
        source: 'http',
      },
      before: null,
      after: null,
    });
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async loginWithGoogle(profile: GoogleOAuthProfile): Promise<{
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
    const tokens = await this.issueTokenPair(persistedUser);

    await this.auditWriter.log({
      action: AuditAction.LOGIN,
      entityType: AuditEntityType.AUTH,
      entityId: persistedUser.id,
      actor: this.toAuditActor(persistedUser),
      entityLabel: persistedUser.email,
      metadata: {
        source: 'google_oauth',
      },
      before: null,
      after: null,
    });

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async logout(user: AuthenticatedUser): Promise<void> {
    await this.refreshTokensRepository
      .createQueryBuilder()
      .update(RefreshTokenEntity)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('revoked_at IS NULL')
      .execute();

    await this.auditWriter.log({
      action: AuditAction.LOGOUT,
      entityType: AuditEntityType.AUTH,
      entityId: user.id,
      actor: user,
      entityLabel: user.email,
      metadata: {
        source: 'http',
      },
      before: null,
      after: null,
    });
  }

  async changePassword(
    user: AuthenticatedUser,
    payload: ChangePasswordDto,
  ): Promise<void> {
    const foundUser = await this.usersRepository.findOne({
      where: { id: user.id },
    });
    if (!foundUser || !foundUser.passwordHash) {
      throw new UnauthorizedException(
        'Không thể đổi mật khẩu cho tài khoản này',
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      payload.current_password,
      foundUser.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    const isSameAsCurrent = await bcrypt.compare(
      payload.new_password,
      foundUser.passwordHash,
    );
    if (isSameAsCurrent) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const saltRounds = this.configService.getOrThrow<number>(
      'PASSWORD_SALT_ROUNDS',
    );
    foundUser.passwordHash = await bcrypt.hash(
      payload.new_password,
      saltRounds,
    );
    await this.usersRepository.save(foundUser);

    await this.refreshTokensRepository
      .createQueryBuilder()
      .update(RefreshTokenEntity)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('revoked_at IS NULL')
      .execute();

    await this.auditWriter.log({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.AUTH,
      entityId: user.id,
      actor: user,
      entityLabel: user.email,
      metadata: {
        source: 'http',
        type: 'change_password',
      },
      before: null,
      after: null,
    });
  }

  private toAuditActor(user: UserEntity): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions:
        user.permissions?.map((permission) => String(permission.code)) ?? [],
    };
  }

  async getMe(user: AuthenticatedUser): Promise<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  }> {
    const foundUser = await this.usersRepository.findOne({
      where: { id: user.id },
    });
    if (!foundUser) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      id: foundUser.id,
      first_name: foundUser.firstName,
      last_name: foundUser.lastName,
      email: foundUser.email,
      phone: foundUser.phone,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const payload = await this.verifyRefreshToken(
      refreshTokenDto.refresh_token,
    );
    const refreshTokenRecord = await this.refreshTokensRepository.findOne({
      where: { id: payload.tokenId, userId: payload.sub },
    });

    if (!refreshTokenRecord || refreshTokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    if (refreshTokenRecord.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const isMatch = await bcrypt.compare(
      refreshTokenDto.refresh_token,
      refreshTokenRecord.tokenHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    refreshTokenRecord.revokedAt = new Date();
    await this.refreshTokensRepository.save(refreshTokenRecord);

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokenPair(user);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  createGoogleState(): string {
    const payload: GoogleOAuthStatePayload = {
      nonce: crypto.randomUUID(),
      type: 'google_oauth_state',
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
      const payload = this.jwtService.verify<GoogleOAuthStatePayload>(state, {
        secret: this.getGoogleStateSecret(),
      });
      if (payload.type !== 'google_oauth_state') {
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
    const target = this.configService.getOrThrow<string>(
      'GOOGLE_SUCCESS_REDIRECT_URL',
    );
    return this.buildRedirectUrl(target, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  }

  buildGoogleFailureRedirect(errorCode: string): string {
    const target = this.configService.getOrThrow<string>(
      'GOOGLE_FAILURE_REDIRECT_URL',
    );
    return this.buildRedirectUrl(target, {
      error: errorCode,
    });
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

  private async issueTokenPair(user: UserEntity): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const refreshTokenRecord = this.refreshTokensRepository.create({
      userId: user.id,
      tokenHash: '',
      expiresAt: this.getRefreshTokenExpiryDate(),
      revokedAt: null,
    });
    const createdRecord =
      await this.refreshTokensRepository.save(refreshTokenRecord);

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      user_id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions?.map((permission) => permission.code) ?? [],
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenId: createdRecord.id,
      type: 'refresh',
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

    createdRecord.tokenHash = await bcrypt.hash(
      refreshToken,
      this.configService.getOrThrow<number>('PASSWORD_SALT_ROUNDS'),
    );
    await this.refreshTokensRepository.save(createdRecord);

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private getRefreshTokenExpiryDate(): Date {
    const now = Date.now();
    const refreshExpirySeconds = this.getExpiryInSeconds(
      'JWT_REFRESH_EXPIRES_IN',
    );
    return new Date(now + refreshExpirySeconds * 1000);
  }

  private getExpiryInSeconds(
    key: 'JWT_ACCESS_EXPIRES_IN' | 'JWT_REFRESH_EXPIRES_IN',
  ): number {
    const duration = this.configService.getOrThrow<string>(key).trim();
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid JWT duration for ${key}: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2];
    const factorMap: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * factorMap[unit];
  }

  private getGoogleStateSecret(): string {
    const configuredSecret =
      this.configService.get<string>('GOOGLE_STATE_SECRET')?.trim() ?? '';
    if (configuredSecret.length > 0) {
      return configuredSecret;
    }
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }
}
