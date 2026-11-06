import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Capacitor } from '@capacitor/core';
import { api } from '@student-reward/shared';
import App from './App.vue';
import { router } from './router';
import { setupPwa } from './pwa';
import { restoreNativeSession } from './services/nativeAuth';
import './style.css';

async function bootstrap() {
  const isAndroid = Capacitor.getPlatform() === 'android';
  api.setBaseUrl(isAndroid ? import.meta.env.VITE_API_BASE_URL : '/api/v1');

  if (isAndroid) {
    try {
      await restoreNativeSession();
    } catch (error) {
      console.error('Could not restore the Android session credential:', error);
    }
  }

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
  setupPwa();
}

void bootstrap();
