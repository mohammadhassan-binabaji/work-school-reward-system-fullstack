import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { Router } from 'vue-router';

type BackHandler = () => boolean; // return true if handled/consumed

const backHandlers: BackHandler[] = [];

/**
 * Registers a high-priority back button handler (e.g. For open bottom sheets or dialogs).
 * Handlers are evaluated in LIFO order.
 * Returns an unregister function.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.indexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Sets up Android system hardware back button handling and deep links.
 */
export function setupMobileNavigation(
  router: Router,
  options?: {
    isMandatoryUpdateActive?: () => boolean;
  },
): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // 1. Android hardware back button handler
  App.addListener('backButton', async () => {
    // If a mandatory update is blocking the screen, back button exits the app
    if (options?.isMandatoryUpdateActive && options.isMandatoryUpdateActive()) {
      await App.exitApp();
      return;
    }

    // Check if any open dialog/sheet consumes the back event
    for (let i = backHandlers.length - 1; i >= 0; i--) {
      const consumed = backHandlers[i]();
      if (consumed) {
        return;
      }
    }

    // Root screen: Dashboard or Login -> Exit application cleanly
    const currentPath = router.currentRoute.value.path;
    if (currentPath === '/' || currentPath === '/login') {
      await App.exitApp();
      return;
    }

    // Secondary screen: Navigate back without loops
    if (window.history.state && window.history.state.back) {
      router.back();
    } else {
      router.replace('/');
    }
  });

  // 2. Handle native deep link intent events
  App.addListener('appUrlOpen', (data) => {
    try {
      const parsedUrl = new URL(data.url);
      const destination = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
      if (destination) {
        router.push(destination);
      }
    } catch {
      // Custom scheme fallback: com.studentreward.student://challenges
      const slug = data.url.split('://').pop();
      if (slug) {
        const destination = slug.startsWith('/') ? slug : `/${slug}`;
        router.push(destination);
      }
    }
  });
}
