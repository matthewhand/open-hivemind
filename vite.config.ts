import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const frontendRoot = resolve(__dirname, 'src/frontend')

export default defineConfig({
  root: frontendRoot,
  publicDir: resolve(__dirname, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@frontend': frontendRoot,
      '@frontend-components': resolve(frontendRoot, 'components'),
      '@frontend-hooks': resolve(frontendRoot, 'hooks'),
      '@frontend-services': resolve(frontendRoot, 'services'),
      '@src': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3028,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist/frontend'),
    emptyOutDir: true,
    sourcemap: true,
  },
})
