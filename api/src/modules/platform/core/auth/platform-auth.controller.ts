import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentPlatformUser } from './current-platform-user.decorator';
import { PlatformRegisterDto } from './dto/platform-register.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformRefreshTokenDto } from './dto/platform-refresh-token.dto';
import { PlatformGoogleAuthGuard } from './guards/platform-google-auth.guard';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAuthorizationGuard } from '../authorization/guards/platform-authorization.guard';
import type { PlatformAuthenticatedUser } from './platform-auth.types';
import type { PlatformGoogleOAuthProfile } from './google-auth.types';
import type { Request, Response } from 'express';

const AUTH_THROTTLE_LIMIT = Number.parseInt(
  process.env.THROTTLE_AUTH_LIMIT ?? '10',
  10,
);
const AUTH_THROTTLE_TTL_MS = Number.parseInt(
  process.env.THROTTLE_AUTH_TTL_MS ?? '60000',
  10,
);

@ApiTags('platform-auth')
@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly platformAuthService: PlatformAuthService) {}

  @Post('login')
  @Throttle({
    default: {
      limit: Number.isFinite(AUTH_THROTTLE_LIMIT) ? AUTH_THROTTLE_LIMIT : 10,
      ttl: Number.isFinite(AUTH_THROTTLE_TTL_MS) ? AUTH_THROTTLE_TTL_MS : 60000,
    },
  })
  @ApiOperation({ summary: 'Platform login' })
  @ApiOkResponse({ description: 'Platform login successful' })
  @HttpCode(200)
  async login(@Body() payload: PlatformLoginDto) {
    const tokens = await this.platformAuthService.login(payload);
    return { success: true, data: tokens };
  }

  @Post('register')
  @Throttle({
    default: {
      limit: Number.isFinite(AUTH_THROTTLE_LIMIT) ? AUTH_THROTTLE_LIMIT : 10,
      ttl: Number.isFinite(AUTH_THROTTLE_TTL_MS) ? AUTH_THROTTLE_TTL_MS : 60000,
    },
  })
  @ApiOperation({ summary: 'Platform register account' })
  @ApiOkResponse({ description: 'Platform register successful' })
  @HttpCode(201)
  async register(@Body() payload: PlatformRegisterDto) {
    const result = await this.platformAuthService.register(payload);
    return { success: true, data: result };
  }

  @Post('refresh-token')
  @Throttle({
    default: {
      limit: Number.isFinite(AUTH_THROTTLE_LIMIT) ? AUTH_THROTTLE_LIMIT : 10,
      ttl: Number.isFinite(AUTH_THROTTLE_TTL_MS) ? AUTH_THROTTLE_TTL_MS : 60000,
    },
  })
  @ApiOperation({ summary: 'Refresh platform access token' })
  @ApiOkResponse({ description: 'Platform access token refreshed' })
  @HttpCode(200)
  @Header('x-refresh-token-rotated', 'true')
  async refreshToken(@Body() payload: PlatformRefreshTokenDto) {
    const tokens = await this.platformAuthService.refreshToken(payload);
    return { success: true, data: tokens };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Platform logout (revoke platform refresh tokens)' })
  @ApiBearerAuth('access-token')
  @UseGuards(PlatformJwtAuthGuard, PlatformAuthorizationGuard)
  @HttpCode(200)
  async logout(@CurrentPlatformUser() user: PlatformAuthenticatedUser) {
    await this.platformAuthService.logout(user.id);
    return { success: true, message: 'Logout successful' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current platform user' })
  @ApiBearerAuth('access-token')
  @UseGuards(PlatformJwtAuthGuard, PlatformAuthorizationGuard)
  async getMe(@CurrentPlatformUser() user: PlatformAuthenticatedUser) {
    const me = await this.platformAuthService.getMe(user);
    return { success: true, data: me };
  }

  @Get('google')
  @UseGuards(PlatformGoogleAuthGuard)
  googleAuth(@Query('state') state?: string) {
    return {
      success: true,
      data: { state },
    };
  }

  @Get('google/callback')
  @UseGuards(PlatformGoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: Request & { user?: PlatformGoogleOAuthProfile },
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    try {
      this.platformAuthService.assertGoogleState(state);
      const profile = req.user;
      if (!profile) {
        throw new UnauthorizedException('Google profile is unavailable');
      }
      const tokens = await this.platformAuthService.loginWithGoogle(profile);
      return res.redirect(this.platformAuthService.buildGoogleSuccessRedirect(tokens));
    } catch {
      return res.redirect(
        this.platformAuthService.buildGoogleFailureRedirect('oauth_failed'),
      );
    }
  }
}
