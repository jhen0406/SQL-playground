import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
  },
} as any);
