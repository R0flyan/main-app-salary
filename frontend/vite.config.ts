import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/components/ProtectedRoute.tsx',
        'src/components/VacanciesManager.tsx',
        'src/contexts/AuthContext.tsx',
        'src/pages/LoginPage.tsx',
      ],
      thresholds: {
        lines: 60,
        functions: 25,
        branches: 55,
        statements: 60,
      },
    },
  },
})
