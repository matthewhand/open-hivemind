import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        presets: [
          [
            '@babel/preset-react',
            { runtime: 'automatic', importSource: 'react', development: false }
          ]
        ]
      }
    }),
    tailwindcss()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3028',
        changeOrigin: true,
        secure: false
      },
      '/webui': {
        target: 'http://localhost:3028',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@src': './src',
      '@config': '../config',
      '@webui': './webui/src'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries
          react: ['react', 'react-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          router: ['react-router-dom'],
          charts: ['recharts'],
          daisyui: ['daisyui']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@reduxjs/toolkit', 'react-router-dom', 'recharts']
  }
})
