import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@src', replacement: path.resolve(__dirname, './src') },
      { find: '@config', replacement: path.resolve(__dirname, '../src/config') },
    ],
  },
})
