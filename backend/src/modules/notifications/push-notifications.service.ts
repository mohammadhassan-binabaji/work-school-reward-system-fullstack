import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Notification } from '@prisma/client';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const FCM_BATCH_SIZE = 500;

@Injectable()
export class PushNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationsService.name);
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.logger.warn(
        'FCM is not configured; Android push delivery is disabled. Set GOOGLE_APPLICATION_CREDENTIALS to enable it.',
      );
      return;
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: applicationDefault(),
        projectId: this.configService.get<string>('app.firebaseProjectId') || undefined,
      });
    }
    this.enabled = true;
    this.logger.log('FCM push delivery is enabled');
  }

  async send(notification: Pick<Notification, 'id' | 'recipientId' | 'subject' | 'body'>) {
    if (!this.enabled) {
      return;
    }

    const devices = await this.prisma.pushDevice.findMany({
      where: { userId: notification.recipientId },
      select: { token: true },
    });

    for (let offset = 0; offset < devices.length; offset += FCM_BATCH_SIZE) {
      const tokens = devices.slice(offset, offset + FCM_BATCH_SIZE).map((device) => device.token);
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: {
          title: notification.subject,
          body: notification.body,
        },
        android: {
          notification: {
            channelId: 'student-notifications',
          },
        },
        data: {
          notificationId: notification.id,
          route: '/notifications',
        },
      });

      const invalidTokens: string[] = [];
      response.responses.forEach((result, index) => {
        if (result.success) {
          return;
        }

        const code = result.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[index]);
        } else {
          this.logger.warn(`FCM delivery failed for notification ${notification.id}: ${code}`);
        }
      });

      if (invalidTokens.length > 0) {
        await this.prisma.pushDevice.deleteMany({
          where: { userId: notification.recipientId, token: { in: invalidTokens } },
        });
      }
    }
  }
}
