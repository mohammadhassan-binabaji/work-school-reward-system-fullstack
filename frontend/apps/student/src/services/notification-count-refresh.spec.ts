import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNotificationCountRefresh } from '@student-reward/shared';

function createVisibilityDocument() {
  let visible = true;
  let listener: EventListener | undefined;

  const documentRef = {
    get visibilityState() {
      return visible ? 'visible' : 'hidden';
    },
    addEventListener: vi.fn((_type: string, callback: EventListenerOrEventListenerObject) => {
      listener = callback as EventListener;
    }),
    removeEventListener: vi.fn(),
  } as unknown as Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;

  return {
    documentRef,
    setVisible(value: boolean) {
      visible = value;
      listener?.(new Event('visibilitychange'));
    },
  };
}

describe('notification count refresh lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes on authentication and polls every five active minutes only', () => {
    vi.useFakeTimers();
    const fetchUnreadCount = vi.fn(async () => {});
    const controller = createNotificationCountRefresh({ fetchUnreadCount });

    controller.start(false);
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(fetchUnreadCount).not.toHaveBeenCalled();

    controller.setAuthenticated(true);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(2);

    controller.setAuthenticated(false);
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  it('pauses while hidden and refreshes immediately when visible again', () => {
    vi.useFakeTimers();
    const { documentRef, setVisible } = createVisibilityDocument();
    const fetchUnreadCount = vi.fn(async () => {});
    const controller = createNotificationCountRefresh({ fetchUnreadCount, document: documentRef });

    controller.start(true);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(1);

    setVisible(false);
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(1);

    setVisible(true);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(3);
    controller.stop();
  });

  it('refreshes on native foreground return and removes its listeners on stop', async () => {
    vi.useFakeTimers();
    const fetchUnreadCount = vi.fn(async () => {});
    const removeAppStateListener = vi.fn();
    let onAppStateChange: ((isActive: boolean) => void) | undefined;
    const controller = createNotificationCountRefresh({
      fetchUnreadCount,
      subscribeToAppState: async (listener) => {
        onAppStateChange = listener;
        return removeAppStateListener;
      },
    });

    controller.start(true);
    await Promise.resolve();
    expect(onAppStateChange).toBeDefined();
    expect(fetchUnreadCount).toHaveBeenCalledTimes(1);

    onAppStateChange?.(false);
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(1);

    onAppStateChange?.(true);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(2);
    controller.stop();
    expect(removeAppStateListener).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(fetchUnreadCount).toHaveBeenCalledTimes(2);
  });
});
