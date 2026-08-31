// Snapshots the real seedflow database (not seedflow_test) to a local file
// via `docker exec ... pg_dump`, run inside the Postgres container so the
// dump tool version always matches the server exactly — no local psql/pg_dump
// client install required on the host.
//
// Usage: tsx scripts/backupDatabase.ts [outputDir]
// Defaults to server/backups/, which is gitignored (a dump can contain real
// farmer/organization data, same sensitivity as the database itself).
import { spawn } from 'child_process';
import { existsSync, mkdirSync, statSync } from 'fs';
import { createWriteStream } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONTAINER_NAME = 'seedflow-postgres';
const DB_USER = 'seedflow';
const DB_NAME = 'seedflow';

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function backupDatabase(outputDir: string): Promise<string> {
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, `seedflow-${timestamp()}.dump`);
  // -Fc (custom format): compressed, and the only format pg_restore can
  // selectively restore from or run with --clean — a plain SQL dump can't.
  const dump = spawn('docker', ['exec', CONTAINER_NAME, 'pg_dump', '-U', DB_USER, '-Fc', '-d', DB_NAME], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const writeStream = createWriteStream(outputPath);
  dump.stdout.pipe(writeStream);

  let stderr = '';
  dump.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const exitCode: number = await new Promise((resolvePromise, reject) => {
    dump.on('error', reject); // e.g. docker binary not found
    dump.on('close', resolvePromise);
  });

  if (exitCode !== 0) {
    throw new Error(`pg_dump exited with code ${exitCode}: ${stderr.trim()}`);
  }

  const { size } = statSync(outputPath);
  console.log(`Backed up ${DB_NAME} -> ${outputPath} (${(size / 1024).toFixed(1)} KB)`);
  return outputPath;
}

async function main(): Promise<void> {
  const outputDir = resolve(process.argv[2] ?? join(__dirname, '..', 'backups'));
  await backupDatabase(outputDir);
}

// Only auto-run when executed directly (`tsx scripts/backupDatabase.ts`),
// not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
