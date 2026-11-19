import { Test } from '@nestjs/testing';
import { AccountState, OriginatingEntityType, Role } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService custom notifications', () => {
  const transaction = {
    user: {
      findMany: jest.fn(),
    },
    notification: {
      createManyAndReturn: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };
  const delivery = {
    dispatch: jest.fn(),
  };
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationDeliveryService, useValue: delivery },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  it('creates and dispatches a notification for each active student and teacher selected by an admin', async () => {
    transaction.user.findMany.mockResolvedValue([
      { id: 'student-1', role: Role.STUDENT, accountState: AccountState.ACTIVE },
      { id: 'teacher-1', role: Role.TEACHER, accountState: AccountState.ACTIVE },
    ]);
    transaction.notification.createManyAndReturn.mockResolvedValue([
      { id: 'notification-1', recipientId: 'student-1' },
      { id: 'notification-2', recipientId: 'teacher-1' },
    ]);

    const result = await service.sendCustomNotification(Role.ADMIN, {
      recipientIds: ['student-1', 'teacher-1'],
      subject: '  اطلاعیه  ',
      body: '  متن پیام  ',
    });

    expect(result).toEqual({ sentCount: 2 });
    expect(transaction.notification.createManyAndReturn).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          recipientId: 'student-1',
          subject: 'اطلاعیه',
          body: 'متن پیام',
          originatingEntityType: OriginatingEntityType.CUSTOM_MESSAGE,
        }),
        expect.objectContaining({
          recipientId: 'teacher-1',
          subject: 'اطلاعیه',
          body: 'متن پیام',
          originatingEntityType: OriginatingEntityType.CUSTOM_MESSAGE,
        }),
      ]),
    });
    expect(delivery.dispatch).toHaveBeenCalledTimes(2);
  });

  it('rejects a vice principal batch containing a teacher without creating notifications', async () => {
    transaction.user.findMany.mockResolvedValue([
      { id: 'student-1', role: Role.STUDENT, accountState: AccountState.ACTIVE },
      { id: 'teacher-1', role: Role.TEACHER, accountState: AccountState.ACTIVE },
    ]);

    await expect(
      service.sendCustomNotification(Role.VICE_PRINCIPAL, {
        recipientIds: ['student-1', 'teacher-1'],
        subject: 'اطلاعیه',
        body: 'متن پیام',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(transaction.notification.createManyAndReturn).not.toHaveBeenCalled();
    expect(delivery.dispatch).not.toHaveBeenCalled();
  });

  it('allows vice principals to notify active students', async () => {
    transaction.user.findMany.mockResolvedValue([
      { id: 'student-1', role: Role.STUDENT, accountState: AccountState.ACTIVE },
    ]);
    transaction.notification.createManyAndReturn.mockResolvedValue([
      { id: 'notification-1', recipientId: 'student-1' },
    ]);

    await expect(
      service.sendCustomNotification(Role.VICE_PRINCIPAL, {
        recipientIds: ['student-1'],
        subject: 'اطلاعیه',
        body: 'متن پیام',
      }),
    ).resolves.toEqual({ sentCount: 1 });
    expect(delivery.dispatch).toHaveBeenCalledTimes(1);
  });

  it('rejects inactive recipients before creating any notifications', async () => {
    transaction.user.findMany.mockResolvedValue([
      { id: 'student-1', role: Role.STUDENT, accountState: AccountState.INACTIVE },
    ]);

    await expect(
      service.sendCustomNotification(Role.ADMIN, {
        recipientIds: ['student-1'],
        subject: 'اطلاعیه',
        body: 'متن پیام',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.notification.createManyAndReturn).not.toHaveBeenCalled();
    expect(delivery.dispatch).not.toHaveBeenCalled();
  });
});
