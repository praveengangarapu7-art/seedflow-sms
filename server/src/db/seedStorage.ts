import type { AuthenticatedUser } from '../middleware/requireAuth';
import { createStorageLocation } from '../modules/storage/storageLocations.service';
import { assignToStorage } from '../modules/storage/storageAssignments.service';
import { recordConditionLog } from '../modules/storage/storageConditionLogs.service';
import { pool } from './pool';

async function userFor(email: string): Promise<AuthenticatedUser> {
  const result = await pool.query('SELECT id, email, role, organization_id FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row) throw new Error(`Seed user ${email} not found — run "npm run seed:auth" first`);
  return { id: row.id, email: row.email, role: row.role, organizationId: row.organization_id };
}

async function alreadySeeded(): Promise<boolean> {
  const result = await pool.query('SELECT 1 FROM storage_locations LIMIT 1');
  return result.rows.length > 0;
}

async function run(): Promise<void> {
  if (await alreadySeeded()) {
    console.log('Storage demo data already present — skipping.');
    await pool.end();
    return;
  }

  const warehouse = await userFor('warehouse@seedsphere.com');
  const orgResult = await pool.query("SELECT id FROM organizations WHERE name = 'Central Warehouse Co'");
  const organizationId = orgResult.rows[0]?.id;
  if (!organizationId) throw new Error('Central Warehouse Co organization not found — run "npm run seed:auth" first');

  const coldStorage = await createStorageLocation({
    organizationId,
    code: 'WH-COLD-A1',
    warehouseZone: 'Cold Storage A',
    shelf: 'Shelf 3',
    capacityUnits: 200,
    targetTemperatureC: 6,
    targetHumidityPercent: 40,
    dailyRatePerUnit: 0.05,
  });
  const dryStorage = await createStorageLocation({
    organizationId,
    code: 'WH-DRY-B2',
    warehouseZone: 'Dry Storage B',
    shelf: 'Shelf 7',
    capacityUnits: 500,
    targetTemperatureC: 25,
    targetHumidityPercent: 55,
    dailyRatePerUnit: 0.02,
  });
  console.log(`created locations ${coldStorage.code}, ${dryStorage.code}`);

  const batchesResult = await pool.query('SELECT id, batch_code FROM packaging_batches ORDER BY created_at ASC');
  const batches = batchesResult.rows;
  if (batches.length === 0) {
    console.log('No packaging batches found — run the packaging module first to create some.');
  } else {
    for (const [index, batch] of batches.entries()) {
      const location = index % 2 === 0 ? coldStorage : dryStorage;
      try {
        await assignToStorage(batch.id, location.id, warehouse, 'Initial placement');
        console.log(`assigned ${batch.batch_code} to ${location.code}`);
      } catch (error) {
        console.log(`skip assigning ${batch.batch_code}: ${(error as Error).message}`);
      }
    }
  }

  // A normal reading, and one that deliberately deviates to demo the alert.
  await recordConditionLog(coldStorage.id, { temperature: 15.5, humidity: 41 }, warehouse);
  await recordConditionLog(dryStorage.id, { temperature: 31, humidity: 68 }, warehouse);
  console.log('recorded condition logs (one within range, one deviating)');

  console.log('Storage demo data created.');
  await pool.end();
}

run().catch((error) => {
  console.error('[seedStorage] failed:', error);
  return pool.end().finally(() => process.exit(1));
});
