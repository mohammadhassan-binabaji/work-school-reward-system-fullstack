import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { PaginatedNotificationsDto } from './dto/paginated-notifications.dto';
import { UnreadCountResponseDto } from './dto/unread-count-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { BulkReadResponseDto } from './dto/bulk-read-response.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve authenticated user notification inbox' })
  @ApiResponse({
    status: 200,
    description: 'Paginated notification list',
    type: PaginatedNotificationsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<PaginatedNotificationsDto> {
    return this.notificationsService.getNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Retrieve authenticated user unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count',
    type: UnreadCountResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@CurrentUser('id') userId: string): Promise<UnreadCountResponseDto> {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'Bulk mark-as-read outcome',
    type: BulkReadResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@CurrentUser('id') userId: string): Promise<BulkReadResponseDto> {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark an individual notification as read' })
  @ApiParam({ name: 'id', description: 'Unique UUID of the notification', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Notification successfully marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(userId, id);
  }
}

