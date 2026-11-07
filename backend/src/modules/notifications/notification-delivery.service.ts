import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationEventsService } from './notification-events.service';
import { PushNotificationsService } from './push-notifications.service';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly events: NotificationEventsService,
    private readonly pushNotifications: PushNotificationsService,
  ) {}

  dispatch(notification: Pick<Notification, 'id' | 'recipientId' | 'subject' | 'body'>): void {
    this.events.publish(notification.recipientId, notification.id);
    void this.pushNotifications.send(notification).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`FCM delivery failed for notification ${notification.id}: ${message}`);
    });
  }
}
