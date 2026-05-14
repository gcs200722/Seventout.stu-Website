import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { UserRole } from '../authorization/authorization.types';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  async listNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    const result = await this.notificationService.listNotifications(
      user,
      query,
    );
    return {
      success: true,
      data: result.items,
      pagination: { page: query.page, limit: query.limit, total: result.total },
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) notificationId: string,
  ) {
    await this.notificationService.markAsRead(user, notificationId);
    return { success: true, message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read (current user)' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const updated = await this.notificationService.markAllAsRead(user);
    return { success: true, data: { updated } };
  }
}
