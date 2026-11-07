import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationEventsService } from './notification-events.service';
import { PushNotificationsService } from './push-notifications.service';
import { NotificationDeliveryService } from './notification-delivery.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsListener,
    NotificationEventsService,
    PushNotificationsService,
    NotificationDeliveryService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
