import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
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
    },
  },
})
