import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    environmentOptions: {
      jsdom: {
        // Provide a real origin so that jsdom enables localStorage/sessionStorage.
        // Without this, jsdom uses an opaque origin and throws SecurityError on
        // every localStorage access, breaking all recovery-draft tests.
        url: 'http://localhost:3000',
      },
    },
    env: {
      NODE_ENV: 'development',
      SESSION_SECRET: 'test-secret-at-least-32-characters-long!!',
      DATABASE_URL: 'postgresql://test:test@localhost/testdb',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      // US-13.9: Enforce ≥80% coverage on shared utilities
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      // US-13.9: Enforce ≥80% coverage on tested pure utilities only
      include: [
        'src/features/bed-dashboard/lib/utils.ts',
        'src/features/bed-dashboard/lib/delay-attribution-config.ts',
        'src/features/bed-dashboard/hooks/useElapsedTime.ts',
        'src/features/bed-dashboard/hooks/useMinuteTicker.ts',
        'src/shared/lib/pii.ts',
      ],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './src/__tests__/mocks/server-only.ts'),
    },
  },
})
