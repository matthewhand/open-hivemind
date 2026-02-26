import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Note: Both setup files are required due to React 19 testing changes.
    // src/test/setup.ts configures the global DOM and jest-dom matchers,
    // while src/setupTests.ts polyfills the act() export that was removed from react-dom/test-utils.
    setupFiles: ['./src/test/setup.ts', './src/setupTests.ts'],
  },
});
