import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, createNotificationEventStream } from '@student-reward/shared';

describe('notification event stream', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles notification events and refreshes when connected', async () => {
    const streamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: notification\r\ndata: {"notificationId":"notification-1"}\r\n\r\n',
          ),
        );
        controller.close();
      },
    });
    vi.spyOn(api, 'openEventStream').mockResolvedValue(
      new Response(streamBody, { status: 200 }),
    );
    const onNotification = vi.fn();
    const onConnected = vi.fn();
    const stream = createNotificationEventStream({ onNotification, onConnected });

    stream.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    stream.stop();

    expect(api.openEventStream).toHaveBeenCalledWith(
      '/notifications/events',
      expect.any(AbortSignal),
    );
    expect(onConnected).toHaveBeenCalledOnce();
    expect(onNotification).toHaveBeenCalledWith('notification-1');
  });
});
