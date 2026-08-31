// One-time backfill for seed lots created before the authenticity feature
// (migration 037) existed. Each such lot has no hash chain at all, so a
// genesis CREATE entry — snapshotting the lot's current row — is appended
// for it, exactly as createSeedLot() now does at insert time. This can't be
// pure SQL: computeRecordHash() needs the same JS/crypto used everywhere
// else the chain is written, so a divergent hash algorithm never sneaks in.
//
// Usage: tsx scripts/backfillLotHashChain.ts
import { fileURLToPath } from 'url';
import { pool } from '../src/db/pool';
import { withTransaction } from '../src/db/transaction';
import { appendHashChainEntry } from '../src/modules/authenticity/authenticity.service';
import type { SeedLot } from '../src/modules/seedLots/seedLots.types';

// Not an interactive session — attributed to a synthetic system actor so the
// chain entry and its audit log both show who/what performed the backfill.
const SYSTEM_USER = { id: 'system', email: 'system@seedflow.internal', role: 'Admin', organizationId: null };

export async function backfillLotHashChain(): Promise<{ backfilled: string[] }> {
  const result = await pool.query<SeedLot>(
    `SELECT sl.* FROM seed_lots sl
     WHERE NOT EXISTS (SELECT 1 FROM seed_lot_hash_chain c WHERE c.seed_lot_id = sl.id)
     ORDER BY sl.created_at ASC`,
  );

  const backfilled: string[] = [];
  for (const lot of result.rows) {
    await withTransaction(async (client) => {
      await appendHashChainEntry(client, lot.id, 'CREATE', lot, SYSTEM_USER);
    });
    backfilled.push(lot.lot_code);
    console.log(`Backfilled genesis hash-chain entry for ${lot.lot_code} (${lot.id})`);
  }

  if (backfilled.length === 0) {
    console.log('Nothing to backfill — every seed lot already has a hash chain.');
  }
  return { backfilled };
}

async function main(): Promise<void> {
  await backfillLotHashChain();
  await pool.end();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
