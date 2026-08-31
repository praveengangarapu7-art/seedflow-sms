import { pool } from './pool';

async function run(): Promise<void> {
  const parent = await pool.query(
    `INSERT INTO seed_lots (lot_code, crop, variety, quantity_total, unit, source_farm_id)
     VALUES ('SL-2026-001', 'Paddy', 'Paddy-1010', 5000, 'kg', 'farm-1')
     ON CONFLICT (lot_code) DO NOTHING
     RETURNING id`,
  );

  if (parent.rows[0]) {
    const parentId = parent.rows[0].id;
    await pool.query(
      `INSERT INTO seed_lots (lot_code, crop, variety, parent_lot_id, quantity_total, unit, source_farm_id)
       VALUES ('SL-2026-002', 'Paddy', 'Paddy-1010', $1, 1500, 'kg', 'farm-1')
       ON CONFLICT (lot_code) DO NOTHING`,
      [parentId],
    );
  }

  await pool.query(
    `INSERT INTO seed_lots (lot_code, crop, variety, quantity_total, unit, source_farm_id)
     VALUES ('SL-2026-003', 'Maize', 'Maize-Hybrid-22', 3000, 'kg', 'farm-3')
     ON CONFLICT (lot_code) DO NOTHING`,
  );

  console.log('Seed data applied (or already present).');
}

run()
  .then(() => pool.end())
  .catch((error) => {
    console.error('[seed] failed:', error);
    return pool.end().finally(() => process.exit(1));
  });
