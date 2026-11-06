export interface NotificationCountRefreshOptions {
  fetchUnreadCount: () => Promise<void>;
  document?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  subscribeToAppState?: (listener: (isActive: boolean) => void) => Promise<() => void>;
  intervalMs?: number;
}

export function createNotificationCountRefresh(options: NotificationCountRefreshOptions) {
  const documentRef =
    options.document ?? (typeof document === 'undefined' ? undefined : document);
  const intervalMs = options.intervalMs ?? 5 * 60 * 1000;

  let started = false;
  let authenticated = false;
  let browserVisible = documentRef?.visibilityState !== 'hidden';
  let nativeAppActive = true;
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let removeAppStateListener: (() => void) | undefined;

  function isActive(): boolean {
    return authenticated && browserVisible && nativeAppActive;
  }

  function clearIntervalIfRunning(): void {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  }

  function refresh(): void {
    void options.fetchUnreadCount().catch((error) => {
      console.error('Failed to refresh unread notification count:', error);
    });
  }

  function startInterval(): void {
    if (intervalId === undefined) {
      intervalId = setInterval(refresh, intervalMs);
    }
  }

  function syncActivity(wasActive: boolean): void {
    if (!started) {
      return;
    }

    const active = isActive();
    if (!active) {
      clearIntervalIfRunning();
      return;
    }

    if (!wasActive) {
      refresh();
    }
    startInterval();
  }

  function handleVisibilityChange(): void {
    const wasActive = isActive();
    browserVisible = documentRef?.visibilityState !== 'hidden';
    syncActivity(wasActive);
  }

  function handleAppStateChange(appIsActive: boolean): void {
    const wasActive = isActive();
    nativeAppActive = appIsActive;
    syncActivity(wasActive);
  }

  function start(isAuthenticated: boolean): void {
    if (started) {
      setAuthenticated(isAuthenticated);
      return;
    }

    started = true;
    authenticated = isAuthenticated;
    documentRef?.addEventListener('visibilitychange', handleVisibilityChange);

    if (options.subscribeToAppState) {
      try {
        void options
          .subscribeToAppState(handleAppStateChange)
          .then((removeListener) => {
            if (started) {
              removeAppStateListener = removeListener;
            } else {
              removeListener();
            }
          })
          .catch((error) => {
            console.error('Failed to subscribe to app state changes:', error);
          });
      } catch (error) {
        console.error('Failed to subscribe to app state changes:', error);
      }
    }

    if (isActive()) {
      refresh();
      startInterval();
    }
  }

  function setAuthenticated(isAuthenticated: boolean): void {
    if (authenticated === isAuthenticated) {
      return;
    }

    const wasActive = isActive();
    authenticated = isAuthenticated;
    if (started) {
      syncActivity(wasActive);
    }
  }

  function stop(): void {
    if (!started) {
      return;
    }

    started = false;
    clearIntervalIfRunning();
    documentRef?.removeEventListener('visibilitychange', handleVisibilityChange);
    removeAppStateListener?.();
    removeAppStateListener = undefined;
  }

  return { start, setAuthenticated, stop };
}
