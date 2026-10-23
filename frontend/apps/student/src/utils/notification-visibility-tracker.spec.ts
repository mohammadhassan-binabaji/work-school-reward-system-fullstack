import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationVisibilityTracker } from '@student-reward/shared';

class MockIntersectionObserver {
  private static latest: MockIntersectionObserver;
  private readonly targets = new Set<Element>();

  constructor(private readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.latest = this;
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
  }

  static report(target: Element, intersectionRatio: number): void {
    const observer = MockIntersectionObserver.latest;
    observer.callback(
      [
        {
          target,
          isIntersecting: intersectionRatio > 0,
          intersectionRatio,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 0,
        },
      ],
      observer as unknown as IntersectionObserver,
    );
  }

  static isObserving(target: Element): boolean {
    return MockIntersectionObserver.latest.targets.has(target);
  }
}

describe('NotificationVisibilityTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('marks an unread notification read after 50% visibility is sustained for one second', () => {
    const onViewed = vi.fn();
    const tracker = new NotificationVisibilityTracker(onViewed);
    const card = {} as Element;
    tracker.observe(card, 'notification-1', true);

    MockIntersectionObserver.report(card, 0.49);
    vi.advanceTimersByTime(1000);
    expect(onViewed).not.toHaveBeenCalled();

    MockIntersectionObserver.report(card, 0.5);
    vi.advanceTimersByTime(999);
    expect(onViewed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(onViewed).toHaveBeenCalledOnce();
    expect(onViewed).toHaveBeenCalledWith('notification-1');
    expect(MockIntersectionObserver.isObserving(card)).toBe(false);
    tracker.disconnect();
  });

  it('restarts the timer when the card falls below the visibility threshold', () => {
    const onViewed = vi.fn();
    const tracker = new NotificationVisibilityTracker(onViewed);
    const card = {} as Element;
    tracker.observe(card, 'notification-2', true);

    MockIntersectionObserver.report(card, 0.75);
    vi.advanceTimersByTime(700);
    MockIntersectionObserver.report(card, 0.49);
    vi.advanceTimersByTime(500);
    expect(onViewed).not.toHaveBeenCalled();

    MockIntersectionObserver.report(card, 0.5);
    vi.advanceTimersByTime(1000);

    expect(onViewed).toHaveBeenCalledOnce();
    expect(onViewed).toHaveBeenCalledWith('notification-2');
    tracker.disconnect();
  });

  it('cancels tracking when the notification is no longer unread', () => {
    const onViewed = vi.fn();
    const tracker = new NotificationVisibilityTracker(onViewed);
    const card = {} as Element;
    tracker.observe(card, 'notification-3', true);

    MockIntersectionObserver.report(card, 0.5);
    vi.advanceTimersByTime(500);
    tracker.observe(card, 'notification-3', false);
    vi.advanceTimersByTime(1000);

    expect(onViewed).not.toHaveBeenCalled();
    expect(MockIntersectionObserver.isObserving(card)).toBe(false);
    tracker.disconnect();
  });
});
