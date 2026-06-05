import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // shared-types has no built dist; resolve it to source so vitest can load it
      '@hivemind/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts', './src/setupTests.ts'],
    restoreMocks: true,
  },
});
