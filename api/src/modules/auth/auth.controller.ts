import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Req,
  Res,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { GoogleOAuthProfile } from './google-auth.types';
import type { Request, Response } from 'express';

const AUTH_THROTTLE_LIMIT = Number.parseInt(
  process.env.THROTTLE_AUTH_LIMIT ?? '10',
  10,
);
const AUTH_THROTTLE_TTL_MS = Number.parseInt(
  process.env.THROTTLE_AUTH_TTL_MS ?? '60000',
  10,
);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({
    default: {
      limit: Number.isFinite(AUTH_THROTTLE_LIMIT) ? AUTH_THROTTLE_LIMIT : 10,
      ttl: Number.isFinite(AUTH_THROTTLE_TTL_MS) ? AUTH_THROTTLE_TTL_MS : 60000,
    },
  })
  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  @ApiOkResponse({
    description: 'Login successful',
    example: {
      success: true,
      data: {
        access_token: 'jwt_token',
        refresh_token: 'refresh_token',
      },
      message: 'Login successful',
    },
  })
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    const tokens = await this.authService.login(loginDto);
    return {
      success: true,
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      },
      message: 'Login successful',
    };
  }

  @Post('register')
  @Throttle({
    default: {
      limit: Number.isFinite(AUTH_THROTTLE_LIMIT) ? AUTH_THROTTLE_LIMIT : 10,
      ttl: Number.isFinite(AUTH_THROTTLE_TTL_MS) ? AUTH_THROTTLE_TTL_MS : 60000,
    },
  })
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    example: {
      success: true,
      data: {
        user_id: 'uuid',
      },
      message: 'User registered successfully',
    },
  })
  @HttpCode(201)
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      data: result,
      message: 'User registered successfully',
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Đăng xuất hệ thống' })
  @ApiOkResponse({
    description: 'Logout successful',
    example: {
      success: true,
      message: 'Logout successful',
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user);
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản hiện tại' })
  @ApiOkResponse({
    description: 'Password changed successfully',
    example: {
      success: true,
      message: 'Password changed successfully',
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user, payload);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  @ApiOkResponse({
    description: 'Current user info',
    example: {
      success: true,
      data: {
        id: 'uuid',
        first_name: 'Lê',
        last_name: 'Thanh Tùng',
        email: 'john@example.com',
        phone: '0326373527',
      },
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const me = await this.authService.getMe(user);
    return {
      success: true,
      data: me,
    };
  }

  @Post('refresh-token')
  @Throttle({
    default: {
      limit: Number.isFinite(AUTH_THROTTLE_LIMIT) ? AUTH_THROTTLE_LIMIT : 10,
      ttl: Number.isFinite(AUTH_THROTTLE_TTL_MS) ? AUTH_THROTTLE_TTL_MS : 60000,
    },
  })
  @ApiOperation({ summary: 'Cấp lại access token từ refresh token' })
  @ApiOkResponse({
    description: 'Access token refreshed',
    example: {
      success: true,
      data: {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      },
    },
  })
  @HttpCode(200)
  @Header('x-refresh-token-rotated', 'true')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(refreshTokenDto);
    return {
      success: true,
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      },
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(@Query('state') state?: string) {
    // Passport handles redirect to Google when this endpoint is hit.
    return {
      success: true,
      data: {
        state,
      },
    };
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: Request & { user?: GoogleOAuthProfile },
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    try {
      this.authService.assertGoogleState(state);
      const profile = req.user;
      if (!profile) {
        throw new UnauthorizedException('Google profile is unavailable');
      }

      const tokens = await this.authService.loginWithGoogle(profile);
      return res.redirect(this.authService.buildGoogleSuccessRedirect(tokens));
    } catch {
      return res.redirect(
        this.authService.buildGoogleFailureRedirect('oauth_failed'),
      );
    }
  }
}
