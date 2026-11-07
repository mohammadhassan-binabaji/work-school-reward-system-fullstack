import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  Post,
  Sse,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { NotificationEventsService } from './notification-events.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { PaginatedNotificationsDto } from './dto/paginated-notifications.dto';
import { UnreadCountResponseDto } from './dto/unread-count-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { BulkReadResponseDto } from './dto/bulk-read-response.dto';
import { PushDeviceDto } from './dto/push-device.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationEvents: NotificationEventsService,
  ) {}

  @Sse('events')
  @ApiExcludeEndpoint()
  stream(@CurrentUser('id') userId: string): Observable<MessageEvent> {
    return this.notificationEvents.streamFor(userId);
  }

  @Post('push-devices')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Register an Android installation for push notifications' })
  @ApiCreatedResponse({ description: 'Push device registered' })
  async registerPushDevice(
    @CurrentUser('id') userId: string,
    @Body() dto: PushDeviceDto,
  ): Promise<{ success: true }> {
    await this.notificationsService.registerPushDevice(userId, dto.token);
    return { success: true };
  }

  @Delete('push-devices')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Unregister an Android installation from push notifications' })
  async unregisterPushDevice(
    @CurrentUser('id') userId: string,
    @Body() dto: PushDeviceDto,
  ): Promise<{ removedCount: number }> {
    return this.notificationsService.unregisterPushDevice(userId, dto.token);
  }

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
