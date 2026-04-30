import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireOwnerParam } from '../authorization/decorators/require-owner-param.decorator';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.USER_READ)
  async getUsers(@Query() query: ListUsersQueryDto) {
    const users = await this.usersService.listUsers(query);
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

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role by id' })
  @RequireRoles(UserRole.ADMIN)
  async updateUserRole(
    @Param('id') id: string,
    @Body() payload: UpdateUserRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.usersService.updateUserRole(id, payload, actor);
    return {
      success: true,
      message: 'Role updated successfully',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by id' })
  @RequireRoles(UserRole.ADMIN, UserRole.USER)
  @RequireOwnerParam('id')
  async updateUser(
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.usersService.updateUser(id, payload, actor);
    return {
      success: true,
      message: 'User updated successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update user profile by id' })
  @RequireRoles(UserRole.ADMIN, UserRole.USER)
  @RequireOwnerParam('id')
  async patchUser(
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.usersService.updateUser(id, payload, actor);
    return {
      success: true,
      message: 'User updated successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user by id' })
  @RequireRoles(UserRole.ADMIN)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.usersService.softDeleteUser(id, actor);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
