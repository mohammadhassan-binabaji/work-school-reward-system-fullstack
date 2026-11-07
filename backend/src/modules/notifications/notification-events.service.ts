import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subscriber, interval } from 'rxjs';

@Injectable()
export class NotificationEventsService {
  private readonly subscribers = new Map<string, Set<Subscriber<MessageEvent>>>();

  streamFor(userId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const userSubscribers = this.subscribers.get(userId) ?? new Set();
      userSubscribers.add(subscriber);
      this.subscribers.set(userId, userSubscribers);

      const heartbeat = interval(25_000).subscribe(() => {
        subscriber.next({ type: 'ping', data: {} });
      });

      return () => {
        heartbeat.unsubscribe();
        userSubscribers.delete(subscriber);
        if (userSubscribers.size === 0) {
          this.subscribers.delete(userId);
        }
      };
    });
  }

  publish(userId: string, notificationId: string): void {
    for (const subscriber of this.subscribers.get(userId) ?? []) {
      subscriber.next({
        type: 'notification',
        data: { notificationId },
      });
    }
  }
}
