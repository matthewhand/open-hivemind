import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, '../../config'),
      '@webui': path.resolve(__dirname, '../../src/webui/src')
    }
  }
});