import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireOwnerParam } from '../authorization/decorators/require-owner-param.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { UserRole } from '../authorization/authorization.types';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @RequireRoles(UserRole.ADMIN)
  async getUsers() {
    const users = await this.usersService.listUsers();
    return {
      success: true,
      data: users,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @RequireRoles(UserRole.ADMIN, UserRole.USER)
  @RequireOwnerParam('id')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    return {
      success: true,
      data: user,
    };
  }
}
