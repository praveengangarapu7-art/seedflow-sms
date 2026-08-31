import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('warehouse cold storage & shelf-life API', () => {
  it('creates a storage location with a zone and shelf, and filters the list by zone', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const org = await createTestOrganization({ type: 'warehouse' });
    const zone = `Zone-${uniqueSuffix()}`;

    const createRes = await request(app)
      .post('/api/v1/production/storage/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: org.id,
        code: `LOC-${uniqueSuffix()}`,
        warehouseZone: zone,
        shelf: 'Shelf 4',
        capacityUnits: 50,
        targetTemperatureC: 6,
        targetHumidityPercent: 40,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.shelf).toBe('Shelf 4');
    expect(createRes.body.data.warehouse_zone).toBe(zone);

    const listRes = await request(app)
      .get(`/api/v1/production/storage/locations?warehouseZone=${encodeURIComponent(zone)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].id).toBe(createRes.body.data.id);
  });

  it('reports days remaining, alert status, and the storage location for a packaged seed lot', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const org = await createTestOrganization({ type: 'warehouse' });
    const lot = await createTestSeedLot();

    const locationRes = await request(app)
      .post('/api/v1/production/storage/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: org.id,
        code: `LOC-${uniqueSuffix()}`,
        warehouseZone: 'Zone A',
        shelf: 'Shelf 2',
        capacityUnits: 50,
        targetTemperatureC: 5,
        targetHumidityPercent: 40,
      });
    const locationId = locationRes.body.data.id;

    // Packaged 358 days ago with a 12-month shelf life -> ~7 days remaining, i.e. critical (red).
    const packagedAt = new Date();
    packagedAt.setDate(packagedAt.getDate() - 358);
    const batchResult = await pool.query<{ id: string }>(
      `INSERT INTO packaging_batches (batch_code, seed_lot_id, unit_size, unit_count, unit_of_measure, total_quantity, storage_conditions, shelf_life_months, packaged_by, created_at)
       VALUES ($1, $2, 25, 10, 'kg', 250, 'Cool, dry place', 12, $3, $4)
       RETURNING id`,
      [`BATCH-${uniqueSuffix()}`, lot.id, admin.email, packagedAt.toISOString()],
    );
    const batchId = batchResult.rows[0].id;

    await request(app)
      .post(`/api/v1/production/storage/batches/${batchId}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ storageLocationId: locationId });

    const statusesRes = await request(app)
      .get('/api/v1/production/storage/expiration-status')
      .set('Authorization', `Bearer ${token}`);
    expect(statusesRes.status).toBe(200);

    const entry = statusesRes.body.data.find((e: { packagingBatchId: string }) => e.packagingBatchId === batchId);
    expect(entry).toBeDefined();
    expect(entry.seedLotId).toBe(lot.id);
    expect(entry.currentLocationCode).toBe(locationRes.body.data.code);
    expect(entry.currentLocationZone).toBe('Zone A');
    expect(entry.currentLocationShelf).toBe('Shelf 2');
    expect(entry.currentLocationTemperatureC).toBe(5);
    expect(entry.daysRemaining).toBeLessThanOrEqual(7);
    expect(entry.status).toBe('critical');
  });
});
