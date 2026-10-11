import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@student-reward/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5175,
  },
});
