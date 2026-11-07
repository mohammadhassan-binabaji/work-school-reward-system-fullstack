import { api } from './api';

export interface NotificationEventStreamOptions {
  onNotification: (notificationId: string) => void;
  onConnected?: () => void;
}

export function createNotificationEventStream(options: NotificationEventStreamOptions) {
  let running = false;
  let active = true;
  let controller: AbortController | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelayMs = 1000;

  function scheduleReconnect(): void {
    if (!running || !active || reconnectTimer !== undefined) {
      return;
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, retryDelayMs);
    retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
  }

  async function readEvents(response: Response, signal: AbortSignal): Promise<void> {
    if (!response.body) {
      throw new Error('Notification event stream response has no body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = '';
    let eventName = 'message';
    let dataLines: string[] = [];

    const dispatch = () => {
      if (dataLines.length > 0) {
        const data = dataLines.join('\n');
        if (eventName === 'notification') {
          let notificationId: string | undefined;
          try {
            const event = JSON.parse(data) as { notificationId?: string };
            notificationId = event.notificationId;
          } catch (error) {
            console.warn('Received an invalid notification stream event:', error);
          }
          if (notificationId) {
            options.onNotification(notificationId);
          }
        }
      }
      eventName = 'message';
      dataLines = [];
    };

    const readLine = (line: string) => {
      if (line === '') {
        dispatch();
        return;
      }
      if (line.startsWith(':')) {
        return;
      }
      const separator = line.indexOf(':');
      const field = separator < 0 ? line : line.slice(0, separator);
      const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
      if (field === 'event') {
        eventName = value;
      } else if (field === 'data') {
        dataLines.push(value);
      }
    };

    try {
      while (running && !signal.aborted) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        lineBuffer += decoder.decode(value, { stream: true });
        let newlineIndex = lineBuffer.indexOf('\n');
        while (newlineIndex >= 0) {
          const line = lineBuffer.slice(0, newlineIndex).replace(/\r$/, '');
          lineBuffer = lineBuffer.slice(newlineIndex + 1);
          readLine(line);
          newlineIndex = lineBuffer.indexOf('\n');
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }

  async function connect(): Promise<void> {
    if (!running || !active) {
      return;
    }
    const requestController = new AbortController();
    controller = requestController;
    try {
      const response = await api.openEventStream('/notifications/events', requestController.signal);
      if (!running || !active || requestController.signal.aborted) {
        return;
      }
      if (!response.ok) {
        throw new Error(`Notification event stream failed with status ${response.status}`);
      }
      retryDelayMs = 1000;
      options.onConnected?.();
      await readEvents(response, requestController.signal);
    } catch (error) {
      if (running && active && !requestController.signal.aborted) {
        console.warn('Notification event stream disconnected; reconnecting:', error);
      }
    } finally {
      if (controller === requestController) {
        controller = undefined;
        if (running && active) {
          scheduleReconnect();
        }
      }
    }
  }

  function start(): void {
    if (running) {
      return;
    }
    running = true;
    void connect();
  }

  function setActive(isActive: boolean): void {
    const wasActive = active;
    active = isActive;
    if (!active) {
      controller?.abort();
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      return;
    }
    if (!wasActive && running && (!controller || controller.signal.aborted)) {
      controller = undefined;
      void connect();
    }
  }

  function stop(): void {
    running = false;
    controller?.abort();
    controller = undefined;
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  return { start, stop, setActive };
}
