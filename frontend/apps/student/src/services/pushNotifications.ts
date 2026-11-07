import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import type { PluginListenerHandle } from '@capacitor/core';
import { api } from '@student-reward/shared';
import { isAndroidApp } from './nativeAuth';

let registeredToken: string | null = null;

export async function unregisterCurrentPushToken(): Promise<void> {
  if (!isAndroidApp() || !registeredToken) {
    return;
  }

  const token = registeredToken;
  await api.delete('/notifications/push-devices', { token });
  registeredToken = null;
  await FirebaseMessaging.deleteToken();
}

export function createStudentPushNotifications(onNotificationOpened: () => void) {
  let started = false;
  let listeners: PluginListenerHandle[] = [];

  async function registerToken(token: string): Promise<void> {
    await api.post('/notifications/push-devices', { token });
    registeredToken = token;
  }

  async function start(): Promise<void> {
    if (!isAndroidApp() || started) {
      return;
    }
    started = true;

    try {
      listeners = await Promise.all([
        FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
          void registerToken(token).catch((error: unknown) => {
            console.error('Failed to register refreshed Android push token:', error);
          });
        }),
        FirebaseMessaging.addListener('notificationActionPerformed', () => {
          onNotificationOpened();
        }),
      ]);

      let permission = await FirebaseMessaging.checkPermissions();
      if (permission.receive === 'prompt') {
        permission = await FirebaseMessaging.requestPermissions();
      }
      if (permission.receive !== 'granted') {
        await stop();
        return;
      }

      await FirebaseMessaging.createChannel({
        id: 'student-notifications',
        name: 'اعلان‌های نوین',
        description: 'اعلان‌های سامانه پاداش دانش‌آموزی',
        importance: 3,
      });

      const { token } = await FirebaseMessaging.getToken();
      await registerToken(token);
    } catch (error) {
      console.error('Failed to initialize Android push notifications:', error);
      await stop();
    }
  }

  async function stop(): Promise<void> {
    started = false;
    const currentListeners = listeners;
    listeners = [];
    await Promise.all(
      currentListeners.map((listener) =>
        listener.remove().catch((error: unknown) => {
          console.error('Failed to remove an Android push listener:', error);
        }),
      ),
    );
  }

  return { start, stop };
}
