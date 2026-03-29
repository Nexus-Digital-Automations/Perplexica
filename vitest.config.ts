import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'tests/playwright'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.d.ts'],
      reporter: ['text', 'lcov'],
    },
    // Fake timers for tests that use setTimeout/setInterval
    // (enable per-file with vi.useFakeTimers())
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
