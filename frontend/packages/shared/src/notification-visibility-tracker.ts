type TrackedNotification = {
  id: string;
  timer: ReturnType<typeof setTimeout> | null;
  visible: boolean;
};

export class NotificationVisibilityTracker {
  private readonly targets = new Map<Element, TrackedNotification>();
  private readonly observer: IntersectionObserver | null;

  constructor(private readonly onViewed: (id: string) => void | Promise<void>) {
    this.observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(this.handleIntersections, { threshold: [0, 0.5] });
  }

  observe(element: Element, id: string, unread: boolean): void {
    const current = this.targets.get(element);

    if (!unread || !this.observer) {
      this.unobserve(element);
      return;
    }

    if (current?.id === id) {
      return;
    }

    this.unobserve(element);
    this.targets.set(element, { id, timer: null, visible: false });
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    const tracked = this.targets.get(element);
    if (tracked?.timer !== null && tracked?.timer !== undefined) {
      clearTimeout(tracked.timer);
    }
    this.targets.delete(element);
    this.observer?.unobserve(element);
  }

  disconnect(): void {
    for (const element of this.targets.keys()) {
      this.unobserve(element);
    }
    this.observer?.disconnect();
  }

  private readonly handleIntersections: IntersectionObserverCallback = (entries) => {
    for (const entry of entries) {
      const tracked = this.targets.get(entry.target);
      if (!tracked) {
        continue;
      }

      const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      if (isVisible) {
        if (tracked.timer !== null) {
          continue;
        }

        tracked.visible = true;
        tracked.timer = setTimeout(() => {
          const current = this.targets.get(entry.target);
          if (current !== tracked || !tracked.visible) {
            return;
          }

          this.unobserve(entry.target);
          void this.onViewed(tracked.id);
        }, 1000);
      } else {
        tracked.visible = false;
        if (tracked.timer !== null) {
          clearTimeout(tracked.timer);
          tracked.timer = null;
        }
      }
    }
  };
}
