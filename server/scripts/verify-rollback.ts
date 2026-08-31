/**
 * Proves transactional rollback independent of the application-level quantity
 * check in allocations.service.ts. This script deliberately skips that guard
 * and issues the raw INSERT + UPDATE pair inside withTransaction: the INSERT
 * succeeds, but the UPDATE overshoots quantity_total and trips the
 * chk_seed_lots_allocated_within_total CHECK constraint. That failure must
 * roll back the whole transaction, including the already-inserted allocation
 * row — this script fails loudly if any trace of it survives.
 */
import { pool } from '../src/db/pool';
import { withTransaction } from '../src/db/transaction';

const MARKER = 'rollback-verification-marker';

async function main(): Promise<void> {
  const lotResult = await pool.query(
    `INSERT INTO seed_lots (lot_code, crop, variety, quantity_total)
     VALUES ($1, 'RollbackTestCrop', 'RollbackTestVariety', 100)
     RETURNING id, quantity_total, quantity_allocated`,
    [`SL-ROLLBACK-${Date.now()}`],
  );
  const lot = lotResult.rows[0];
  console.log('[setup] created test lot', lot);

  const oversizedQuantity = Number(lot.quantity_total) + 500;
  let transactionThrew = false;

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO seed_lot_allocations (seed_lot_id, allocated_to, quantity, performed_by, notes)
         VALUES ($1, $2, $3, 'rollback-script', $4)`,
        [lot.id, MARKER, oversizedQuantity, MARKER],
      );
      console.log('[tx] allocation row inserted inside the transaction (not yet committed)');

      // This violates chk_seed_lots_allocated_within_total and throws.
      await client.query('UPDATE seed_lots SET quantity_allocated = quantity_allocated + $1 WHERE id = $2', [
        oversizedQuantity,
        lot.id,
      ]);
      console.log('[tx] this line should never print');
    });
  } catch (error) {
    transactionThrew = true;
    console.log('[tx] caught expected error:', (error as Error).message);
  }

  const survivingAllocation = await pool.query('SELECT id FROM seed_lot_allocations WHERE allocated_to = $1', [MARKER]);
  const reloadedLot = await pool.query('SELECT quantity_allocated FROM seed_lots WHERE id = $1', [lot.id]);

  console.log('[verify] transaction threw:', transactionThrew);
  console.log('[verify] surviving allocation rows (expect 0):', survivingAllocation.rowCount);
  console.log('[verify] lot quantity_allocated after rollback (expect 0):', reloadedLot.rows[0].quantity_allocated);

  await pool.query('DELETE FROM seed_lots WHERE id = $1', [lot.id]);

  const passed = transactionThrew && survivingAllocation.rowCount === 0 && Number(reloadedLot.rows[0].quantity_allocated) === 0;
  console.log(passed ? '\nROLLBACK VERIFICATION PASSED' : '\nROLLBACK VERIFICATION FAILED');

  await pool.end();
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error('[verify-rollback] unexpected failure:', error);
  process.exit(1);
});
