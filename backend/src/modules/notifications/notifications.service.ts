import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AccountState,
  NotificationReadStatus,
  OriginatingEntityType,
  Prisma,
  Role,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  GetNotificationsQueryDto,
  NotificationStatusFilter,
} from './dto/get-notifications-query.dto';
import { SendCustomNotificationDto } from './dto/send-custom-notification.dto';
import { PaginatedNotificationsDto } from './dto/paginated-notifications.dto';
import { UnreadCountResponseDto } from './dto/unread-count-response.dto';
import { BulkReadResponseDto } from './dto/bulk-read-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationFormatter } from './utils/notification-formatter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  async sendCustomNotification(
    senderRole: Role,
    dto: SendCustomNotificationDto,
  ): Promise<{ sentCount: number }> {
    const subject = dto.subject.trim();
    const body = dto.body.trim();
    if (!subject || !body) {
      throw new BadRequestException('عنوان و متن اعلان الزامی است.');
    }

    if (senderRole !== Role.ADMIN && senderRole !== Role.VICE_PRINCIPAL) {
      throw new ForbiddenException('ارسال اعلان اختصاصی فقط برای مدیر و معاون مجاز است.');
    }

    const allowedRecipientRoles: Role[] =
      senderRole === Role.ADMIN ? [Role.STUDENT, Role.TEACHER] : [Role.STUDENT];
    const originId = randomUUID();
    const formatted = NotificationFormatter.formatCustomNotification(subject, body);

    const notifications = await this.prisma.$transaction(async (transaction) => {
      const recipients = await transaction.user.findMany({
        where: { id: { in: dto.recipientIds } },
        select: { id: true, role: true, accountState: true },
      });

      if (recipients.length !== dto.recipientIds.length) {
        throw new BadRequestException('یک یا چند گیرنده وجود ندارند یا در دسترس نیستند.');
      }

      if (recipients.some((recipient) => !allowedRecipientRoles.includes(recipient.role))) {
        throw new ForbiddenException('ارسال اعلان برای یک یا چند نقش انتخاب‌شده مجاز نیست.');
      }

      if (recipients.some((recipient) => recipient.accountState !== AccountState.ACTIVE)) {
        throw new BadRequestException('ارسال اعلان فقط برای حساب‌های فعال مجاز است.');
      }

      return transaction.notification.createManyAndReturn({
        data: recipients.map((recipient) => ({
          recipientId: recipient.id,
          subject: formatted.subject,
          body: formatted.body,
          originatingEntityType: OriginatingEntityType.CUSTOM_MESSAGE,
          originatingEntityId: originId,
        })),
      });
    });

    notifications.forEach((notification) => this.delivery.dispatch(notification));
    this.logger.log(`Custom notification sent to ${notifications.length} recipients`);
    return { sentCount: notifications.length };
  }

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

  async registerPushDevice(userId: string, token: string): Promise<void> {
    await this.prisma.pushDevice.upsert({
      where: { token },
      create: { userId, token },
      update: { userId },
    });
  }

  async unregisterPushDevice(userId: string, token: string): Promise<{ removedCount: number }> {
    const result = await this.prisma.pushDevice.deleteMany({
      where: { userId, token },
    });
    return { removedCount: result.count };
  }
}
