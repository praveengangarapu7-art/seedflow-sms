// Loaded via vitest.config.ts's `setupFiles`, which runs before any test
// file (and therefore before any module that reads `env.ts`) is imported —
// this is what points the whole suite at the isolated seedflow_test
// database instead of the real dev database.
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env.test') });
