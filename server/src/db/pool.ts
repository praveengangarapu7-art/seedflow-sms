import { Pool, types } from 'pg';
import { env } from '../config/env';

// pg returns NUMERIC as a string by default to avoid float precision loss;
// seed lot quantities are demo-scale, so parse to number for a cleaner API.
types.setTypeParser(1700, (value: string) => parseFloat(value));

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});
