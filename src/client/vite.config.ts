import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        presets: [
          [
            '@babel/preset-react',
            { runtime: 'automatic', importSource: 'react', development: false },
          ],
        ],
      },
    }),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 3028}`,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@src': './src',
      '@config': '../config',
      '@webui': './webui/src',
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries
          redux: ['@reduxjs/toolkit', 'react-redux'],
          router: ['react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@reduxjs/toolkit', 'react-router-dom', 'recharts'],
    // onnxruntime-web ships its own WASM bundles and breaks if Vite tries to
    // pre-bundle it. See Supertonic's own web/vite.config.js for the same advice.
    exclude: ['onnxruntime-web'],
  },
  // @ts-expect-error - Vitest config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
    },
  },
});
