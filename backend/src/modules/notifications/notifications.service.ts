import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationReadStatus, Prisma } from '@prisma/client';
import {
  GetNotificationsQueryDto,
  NotificationStatusFilter,
} from './dto/get-notifications-query.dto';
import { PaginatedNotificationsDto } from './dto/paginated-notifications.dto';
import { UnreadCountResponseDto } from './dto/unread-count-response.dto';
import { BulkReadResponseDto } from './dto/bulk-read-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<PaginatedNotificationsDto> {
    const page = query.page && query.page >= 1 ? query.page : 1;
    const limit = query.limit && query.limit >= 1 ? Math.min(query.limit, 50) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      recipientId: userId,
    };

    if (query.status === NotificationStatusFilter.UNREAD) {
      where.readStatus = NotificationReadStatus.UNREAD;
    } else if (query.status === NotificationStatusFilter.READ) {
      where.readStatus = NotificationReadStatus.READ;
    }

    const [totalItems, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      data: items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const unreadCount = await this.prisma.notification.count({
      where: {
        recipientId: userId,
        readStatus: NotificationReadStatus.UNREAD,
      },
    });

    return { unreadCount };
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.recipientId !== userId) {
      this.logger.warn(
        `Notification ${notificationId} not found or access denied for user ${userId}`,
      );
      throw new NotFoundException('Notification not found');
    }

    if (notification.readStatus === NotificationReadStatus.READ) {
      return notification;
    }

    this.logger.log(`Marking notification ${notificationId} as read for user ${userId}`);
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        readStatus: NotificationReadStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<BulkReadResponseDto> {
    this.logger.log(`Marking all unread notifications as read for user ${userId}`);
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        readStatus: NotificationReadStatus.UNREAD,
      },
      data: {
        readStatus: NotificationReadStatus.READ,
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }
}
