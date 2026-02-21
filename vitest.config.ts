import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      NODE_ENV: 'development',
      SESSION_SECRET: 'test-secret-at-least-32-characters-long!!',
      DATABASE_URL: 'postgresql://test:test@localhost/testdb',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './src/__tests__/mocks/server-only.ts'),
    },
  },
})
