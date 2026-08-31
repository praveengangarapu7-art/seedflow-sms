// Restores the real seedflow database from a dump made by backupDatabase.ts,
// via `docker exec ... pg_restore --clean` inside the Postgres container.
// This OVERWRITES the current database's data, so it refuses to run
// without an explicit --confirm flag — a mistyped command here should fail
// safe, not silently wipe whatever's currently in the database.
//
// Usage: tsx scripts/restoreDatabase.ts <dumpFilePath> --confirm
import { spawn } from 'child_process';
import { createReadStream, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const CONTAINER_NAME = 'seedflow-postgres';
const DB_USER = 'seedflow';
const DB_NAME = 'seedflow';

export async function restoreDatabase(dumpFilePath: string): Promise<void> {
  if (!existsSync(dumpFilePath)) {
    throw new Error(`Dump file not found: ${dumpFilePath}`);
  }

  // --clean drops existing objects before recreating them (a full restore,
  // not a merge); --if-exists silences "does not exist" noise on a
  // first-ever restore into an empty database.
  const restore = spawn(
    'docker',
    ['exec', '-i', CONTAINER_NAME, 'pg_restore', '-U', DB_USER, '-d', DB_NAME, '--clean', '--if-exists'],
    { stdio: ['pipe', 'inherit', 'pipe'] },
  );

  createReadStream(dumpFilePath).pipe(restore.stdin);

  let stderr = '';
  restore.stderr.on('data', (chunk) => {
    stderr += String(chunk);
    process.stderr.write(chunk);
  });

  const exitCode: number = await new Promise((resolvePromise, reject) => {
    restore.on('error', reject);
    restore.on('close', resolvePromise);
  });

  if (exitCode !== 0) {
    throw new Error(`pg_restore exited with code ${exitCode}: ${stderr.trim()}`);
  }

  console.log(`Restored ${DB_NAME} from ${dumpFilePath}`);
}

async function main(): Promise<void> {
  const dumpFilePath = process.argv[2];
  const confirmed = process.argv.includes('--confirm');

  if (!dumpFilePath) {
    console.error('Usage: tsx scripts/restoreDatabase.ts <dumpFilePath> --confirm');
    process.exit(1);
  }
  if (!confirmed) {
    console.error(
      `Refusing to restore without --confirm — this OVERWRITES the current "${DB_NAME}" database.\n` +
        `Re-run as: tsx scripts/restoreDatabase.ts ${dumpFilePath} --confirm`,
    );
    process.exit(1);
  }

  await restoreDatabase(dumpFilePath);
}

// Only auto-run when executed directly (`tsx scripts/restoreDatabase.ts`),
// not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
