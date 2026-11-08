import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync } from 'fs';
import { resolve } from 'path';

const frontendEnvPath = resolve(__dirname, '../../.env');
if (existsSync(frontendEnvPath)) {
  process.loadEnvFile(frontendEnvPath);
}

const appId = process.env.VITE_ANDROID_APP_ID?.trim();
if (!appId) {
  throw new Error('VITE_ANDROID_APP_ID must be configured in frontend/.env.');
}
if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(appId)) {
  throw new Error('VITE_ANDROID_APP_ID must be a valid Android application ID.');
}

const config: CapacitorConfig = {
  appId,
  appName: 'نوین من',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
