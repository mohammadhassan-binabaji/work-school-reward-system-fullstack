import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, envDir);
  const apiBaseUrl = env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL must be configured in frontend/.env.');
  }
  if (!env.VITE_STORAGE_BASE_URL) {
    throw new Error('VITE_STORAGE_BASE_URL must be configured in frontend/.env.');
  }

  const apiProxyTarget = env.VITE_API_PROXY_TARGET || new URL(apiBaseUrl).origin;

  return {
    envDir,
    base: env.VITE_BASE_URL || '/',
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        manifest: {
          name: 'سامانه پاداش دانش‌آموزی - پنل معلم',
          short_name: 'پنل معلم',
          description: 'سامانه اهدای نوین و مدیریت پاداش دانش‌آموزی معلمان',
          theme_color: '#4f46e5',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          start_url: env.VITE_BASE_URL || '/',
          scope: env.VITE_BASE_URL || '/',
          lang: 'fa',
          dir: 'rtl',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@student-reward/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/api/v1': {
          target: apiProxyTarget,
          changeOrigin: false,
        },
      },
    },
  };
});
