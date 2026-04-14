import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
} from './auth.types';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user_id: string }> {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const saltRounds = this.configService.getOrThrow<number>('PASSWORD_SALT_ROUNDS');
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    const user = this.usersRepository.create({
      firstName: registerDto.first_name.trim(),
      lastName: registerDto.last_name.trim(),
      email,
      passwordHash,
      phone: registerDto.phone.trim(),
    });
    const createdUser = await this.usersRepository.save(user);
    return { user_id: createdUser.id };
  }

  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const user = await this.validateCredentials(loginDto.email, loginDto.password);
    const tokens = await this.issueTokenPair(user);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokensRepository
      .createQueryBuilder()
      .update(RefreshTokenEntity)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async getMe(user: AuthenticatedUser): Promise<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  }> {
    const foundUser = await this.usersRepository.findOne({ where: { id: user.id } });
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
    const payload = await this.verifyRefreshToken(refreshTokenDto.refresh_token);
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

    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
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
    const createdRecord = await this.refreshTokensRepository.save(refreshTokenRecord);

    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email };
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

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
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
    const refreshExpirySeconds = this.getExpiryInSeconds('JWT_REFRESH_EXPIRES_IN');
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
}
