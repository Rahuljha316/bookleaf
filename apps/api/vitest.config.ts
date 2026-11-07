import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests sequentially to avoid shared-singleton interference
    pool: 'forks',
    // Only pick up test files under src/
    include: ['src/**/*.test.ts'],
    // No real DB or network needed for unit tests
    environment: 'node',
  },
});

