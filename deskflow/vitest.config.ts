import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'u1-deskflow',
          include: ['tests/u1-deskflow/**/*.test.{ts,tsx}'],
          environment: 'node',
          testTimeout: 15000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: { lines: 80 },
    },
  },
});
