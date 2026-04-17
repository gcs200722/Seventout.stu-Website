import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
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
    await this.authService.logout(user.id);
    return {
      success: true,
      message: 'Logout successful',
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
}
