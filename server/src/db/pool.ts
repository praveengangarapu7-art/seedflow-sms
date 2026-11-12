import { Pool, types, type PoolConfig } from 'pg';
import { env } from '../config/env';

// pg returns NUMERIC as a string by default to avoid float precision loss;
// seed lot quantities are demo-scale, so parse to number for a cleaner API.
types.setTypeParser(1700, (value: string) => parseFloat(value));

/**
 * SSL for hosted Postgres (Supabase, Neon, RDS).
 *
 * Supabase serves its own CA chain, which node-postgres rejects by default as
 * "self-signed certificate in certificate chain". Local Docker Postgres has no
 * TLS at all. So: TLS on (without CA pinning) whenever the URL points at a
 * hosted provider or DATABASE_SSL=true; off for localhost.
 */
function sslConfig(url: string): PoolConfig['ssl'] {
  if (process.env.DATABASE_SSL === 'false') return undefined;
  const hosted = /supabase\.(co|com)|pooler\.supabase|neon\.tech|rds\.amazonaws/.test(url);
  if (hosted || process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  return undefined;
}

/** sslmode in the URL would override the ssl object above, so strip it. */
function withoutSslMode(url: string): string {
  return url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');
}

// Serverless functions (Vercel) each hold their own pool, so keep it small
// there; Supabase's transaction pooler multiplexes them onto real backends.
const defaultMax = process.env.VERCEL ? 3 : 10;

export const pool = new Pool({
  connectionString: withoutSslMode(env.databaseUrl),
  ssl: sslConfig(env.databaseUrl),
  max: Number(process.env.DB_POOL_MAX ?? defaultMax),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});
