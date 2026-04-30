import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  PlatformAccessTokenPayload,
  PlatformAuthenticatedUser,
} from '../platform-auth.types';

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, 'platform-jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: PlatformAccessTokenPayload): PlatformAuthenticatedUser {
    if (payload.token_scope !== 'platform') {
      throw new UnauthorizedException('Invalid platform token scope');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      platformPermissions: payload.platform_permissions ?? [],
      tokenScope: 'platform',
    };
  }
}
