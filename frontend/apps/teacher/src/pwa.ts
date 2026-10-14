import { registerSW } from 'virtual:pwa-register';

export function setupPwa(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, registration) {
      if (registration) {
        // Check for updates periodically (every 60 minutes)
        setInterval(() => {
          registration.update().catch(() => {
            // Silently ignore network failures during periodic checks
          });
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('Teacher PWA service worker registration failed:', error);
    },
  });
}
