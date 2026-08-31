// Standalone script (not a vitest test) — run via `npm run test:perf`.
// Boots the real app on a real port (autocannon needs an actual listening
// server, unlike supertest which can drive an Express app object directly),
// seeds a large dataset, and load-tests the two read endpoints most exposed
// to "large dataset" scaling risk: the plain list and the multi-filter
// search (LATERAL joins across varieties/quality_certificates/storage).
import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '..', '.env.test') });

const autocannon = (await import('autocannon')).default;
const { createApp } = await import('../../src/app');
const { pool } = await import('../../src/db/pool');
const { createTestUser } = await import('../factories/user.factory');
const { ensureBulkSeedLots } = await import('./seedBulkData');

const PORT = 5099;
const TARGET_LOT_COUNT = 20_000;
// Generous — this is a demo-scale app on a dev machine, not a tuned
// production deployment; the point is catching a real regression (an O(n^2)
// query, a missing index) making a request take *seconds*, not enforcing a
// production SLO.
const P99_THRESHOLD_MS = 2000;

interface EndpointResult {
  label: string;
  requestsPerSec: number;
  latencyAvgMs: number;
  latencyP99Ms: number;
  errors: number;
  informational?: boolean;
}

async function benchmark(label: string, path: string, token: string, informational = false): Promise<EndpointResult> {
  const result = await autocannon({
    url: `http://localhost:${PORT}${path}`,
    connections: 10,
    duration: 8,
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    label,
    requestsPerSec: result.requests.average,
    latencyAvgMs: result.latency.average,
    latencyP99Ms: result.latency.p99,
    errors: result.errors,
    informational,
  };
}

async function main(): Promise<void> {
  console.log(`Seeding up to ${TARGET_LOT_COUNT} seed lots for load testing...`);
  const { count } = await ensureBulkSeedLots(TARGET_LOT_COUNT);
  console.log(`Dataset ready: ${count} seed lots.`);

  const admin = await createTestUser({ role: 'Admin' });
  const app = createApp();
  const server = app.listen(PORT);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));

  const loginRes = await fetch(`http://localhost:${PORT}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  });
  const loginPayload = (await loginRes.json()) as { data: { accessToken: string } };
  const token = loginPayload.data.accessToken;

  const results: EndpointResult[] = [];
  results.push(
    await benchmark(
      'GET /production/seed-lots (paginated, limit=50 — realistic page size)',
      '/api/v1/production/seed-lots?limit=50',
      token,
    ),
  );
  results.push(
    await benchmark(
      'GET /production/seed-lots/search (paginated, filtered, joins varieties/certs/storage)',
      '/api/v1/production/seed-lots/search?crop=Paddy&minAvailableQuantity=50&limit=50',
      token,
    ),
  );
  results.push(
    await benchmark(
      'GET /production/seed-lots (unbounded, no limit — known gap, informational only)',
      '/api/v1/production/seed-lots',
      token,
      true,
    ),
  );

  console.log(`\n--- Performance results (dataset size: ${count} seed lots) ---`);
  let failed = false;
  for (const r of results) {
    const withinBudget = r.latencyP99Ms <= P99_THRESHOLD_MS && r.errors === 0;
    const status = r.informational ? 'INFO' : withinBudget ? 'PASS' : 'FAIL';
    if (!r.informational && !withinBudget) failed = true;
    console.log(
      `[${status}] ${r.label}\n  ${r.requestsPerSec.toFixed(1)} req/s | avg ${r.latencyAvgMs.toFixed(1)}ms | p99 ${r.latencyP99Ms.toFixed(1)}ms | errors: ${r.errors}`,
    );
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();

  if (failed) {
    console.error(`\nPerformance regression: p99 latency exceeded ${P99_THRESHOLD_MS}ms threshold.`);
    process.exit(1);
  }
  console.log('\nAll endpoints within performance thresholds.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
