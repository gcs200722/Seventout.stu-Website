import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenEntity } from '../../../tenant/core/auth/entities/refresh-token.entity';
import { PermissionEntity } from '../../../tenant/core/authorization/entities/permission.entity';
import { UserEntity } from '../../../tenant/core/users/user.entity';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformGoogleAuthGuard } from './guards/platform-google-auth.guard';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';
import { PlatformGoogleStrategy } from './strategies/platform-google.strategy';
import { PlatformJwtStrategy } from './strategies/platform-jwt.strategy';
import { PlatformAuthorizationModule } from '../authorization/platform-authorization.module';

@Module({
  imports: [
    JwtModule.register({}),
    PassportModule.register({ defaultStrategy: 'platform-jwt' }),
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity, PermissionEntity]),
    PlatformAuthorizationModule,
  ],
  controllers: [PlatformAuthController],
  providers: [
    PlatformAuthService,
    PlatformJwtStrategy,
    PlatformGoogleStrategy,
    PlatformJwtAuthGuard,
    PlatformGoogleAuthGuard,
  ],
})
export class PlatformAuthModule {}
