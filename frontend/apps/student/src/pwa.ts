import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';

export function setupPwa(): void {
  // Do not register service worker inside native Capacitor Android application
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (Capacitor.isNativePlatform()) {
    return;
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, registration) {
      if (registration) {
        // Check for service worker updates periodically (every 60 minutes)
        setInterval(() => {
          registration.update().catch(() => {
            // Fail silently if offline during periodic check
          });
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('PWA service worker registration failed:', error);
    },
  });
}
