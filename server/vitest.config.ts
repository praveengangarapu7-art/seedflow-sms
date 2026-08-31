import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./tests/setupEnv.ts'],
    // Integration/unit tests share one Postgres test database and touch
    // overlapping tables (organizations, seed_lots, allocations) — running
    // files in parallel would race on that shared state, so files run
    // sequentially while tests within a file may still run concurrently.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  },
});
