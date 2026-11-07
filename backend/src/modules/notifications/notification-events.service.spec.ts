import { NotificationEventsService } from './notification-events.service';

describe('NotificationEventsService', () => {
  it('sends an event only to connected sessions for the recipient', () => {
    const events = new NotificationEventsService();
    const firstUserEvents: unknown[] = [];
    const secondUserEvents: unknown[] = [];
    const firstSubscription = events.streamFor('user-1').subscribe((event) => {
      firstUserEvents.push(event);
    });
    const secondSubscription = events.streamFor('user-2').subscribe((event) => {
      secondUserEvents.push(event);
    });

    events.publish('user-1', 'notification-1');

    expect(firstUserEvents).toEqual([
      { type: 'notification', data: { notificationId: 'notification-1' } },
    ]);
    expect(secondUserEvents).toEqual([]);

    firstSubscription.unsubscribe();
    secondSubscription.unsubscribe();
  });

  it('removes disconnected sessions from the recipient stream', () => {
    const events = new NotificationEventsService();
    const received: unknown[] = [];
    const subscription = events.streamFor('user-1').subscribe((event) => {
      received.push(event);
    });

    subscription.unsubscribe();
    events.publish('user-1', 'notification-1');

    expect(received).toEqual([]);
  });
});
