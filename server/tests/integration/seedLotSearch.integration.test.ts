import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('seed lot search & discovery API (Extend #18)', () => {
  it('finds a crop by free-text query, the way "Search for Tomato" is meant to work', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const tomatoLot = await createTestSeedLot({ crop: `Tomato-${suffix}`, variety: `Roma-${suffix}` });
    const wheatLot = await createTestSeedLot({ crop: `Wheat-${suffix}`, variety: `Durum-${suffix}` });

    const res = await request(app)
      .get(`/api/v1/production/seed-lots/search?q=Tomato-${suffix}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).toContain(tomatoLot.id);
    expect(ids).not.toContain(wheatLot.id);
  });

  it('matches the free-text query against variety and lot code too, not just crop', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const byVariety = await createTestSeedLot({ variety: `UniqueVariety-${suffix}` });
    const byLotCode = await createTestSeedLot({ lotCode: `UNIQUELOT-${suffix}` });

    const varietyRes = await request(app)
      .get(`/api/v1/production/seed-lots/search?q=UniqueVariety-${suffix}`)
      .set('Authorization', `Bearer ${token}`);
    expect(varietyRes.body.data.map((r: { id: string }) => r.id)).toContain(byVariety.id);

    const lotCodeRes = await request(app)
      .get(`/api/v1/production/seed-lots/search?q=UNIQUELOT-${suffix}`)
      .set('Authorization', `Bearer ${token}`);
    expect(lotCodeRes.body.data.map((r: { id: string }) => r.id)).toContain(byLotCode.id);
  });

  it('filters by certification status ("Certified Only"), independent of lab testing status', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const certifiedLot = await createTestSeedLot({ crop: `SearchCrop-${suffix}` });
    const uncertifiedLot = await createTestSeedLot({ crop: `SearchCrop-${suffix}` });

    await pool.query(
      `INSERT INTO quality_certificates (seed_lot_id, version, status, snapshot, generated_by)
       VALUES ($1, 1, 'issued', '{}'::jsonb, $2)`,
      [certifiedLot.id, admin.email],
    );

    const res = await request(app)
      .get(`/api/v1/production/seed-lots/search?crop=${encodeURIComponent(`SearchCrop-${suffix}`)}&certificationStatus=certified`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).toContain(certifiedLot.id);
    expect(ids).not.toContain(uncertifiedLot.id);
    expect(res.body.data.find((r: { id: string }) => r.id === certifiedLot.id).is_certified).toBe(true);
  });

  it('filters by lab testing status, kept as a separate axis from certification status', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const lot = await createTestSeedLot({ crop: `TestingCrop-${suffix}` });
    await pool.query(`UPDATE seed_lots SET testing_status = 'certified' WHERE id = $1`, [lot.id]);

    const res = await request(app)
      .get(`/api/v1/production/seed-lots/search?crop=${encodeURIComponent(`TestingCrop-${suffix}`)}&testingStatus=certified`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(lot.id);
    expect(res.body.data[0].testing_status).toBe('certified');
  });

  it('filters by storage zone and minimum available quantity, and returns results as a flat table-ready list', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const zone = `ZoneSearch-${suffix}`;
    const lot = await createTestSeedLot({ quantityTotal: 500, quantityAllocated: 100 });
    const org = await createTestOrganization({ type: 'warehouse' });

    const locationResult = await pool.query<{ id: string }>(
      `INSERT INTO storage_locations (organization_id, code, warehouse_zone, capacity_units, target_temperature_c, target_humidity_percent)
       VALUES ($1, $2, $3, 100, 5, 40) RETURNING id`,
      [org.id, `LOC-${suffix}`, zone],
    );
    const batchResult = await pool.query<{ id: string }>(
      `INSERT INTO packaging_batches (batch_code, seed_lot_id, unit_size, unit_count, unit_of_measure, total_quantity, storage_conditions, shelf_life_months, packaged_by)
       VALUES ($1, $2, 25, 4, 'kg', 100, 'Cool, dry place', 12, $3)
       RETURNING id`,
      [`BATCH-${suffix}`, lot.id, admin.email],
    );
    await request(app)
      .post(`/api/v1/production/storage/batches/${batchResult.rows[0].id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ storageLocationId: locationResult.rows[0].id });

    const res = await request(app)
      .get(`/api/v1/production/seed-lots/search?storageZone=${encodeURIComponent(zone)}&minAvailableQuantity=100`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const match = res.body.data.find((r: { id: string }) => r.id === lot.id);
    expect(match).toBeDefined();
    expect(match.storage_zones).toContain(zone);
    expect(match.quantity_available).toBe(400);
  });

  it('lists filter options including crops, storage zones, and organizations for the search form', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);

    const res = await request(app)
      .get('/api/v1/production/seed-lots/search/filter-options')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.crops)).toBe(true);
    expect(Array.isArray(res.body.data.storageZones)).toBe(true);
    expect(Array.isArray(res.body.data.organizations)).toBe(true);
  });

  describe('saved searches ("Save Search" / "My Searches")', () => {
    it('saves a search, lists it under the owning user, and lets that user delete it', async () => {
      const user = await createTestUser({ role: 'Admin' });
      const token = await loginAs(user);
      const name = `My Tomato Search ${uniqueSuffix()}`;
      const filters = { q: 'Tomato', certificationStatus: 'certified' as const };

      const saveRes = await request(app)
        .post('/api/v1/production/seed-lots/saved-searches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name, filters });
      expect(saveRes.status).toBe(201);
      expect(saveRes.body.data.name).toBe(name);
      expect(saveRes.body.data.filters).toEqual(filters);

      const listRes = await request(app)
        .get('/api/v1/production/seed-lots/saved-searches')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((s: { id: string }) => s.id === saveRes.body.data.id)).toBe(true);

      const deleteRes = await request(app)
        .delete(`/api/v1/production/seed-lots/saved-searches/${saveRes.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(deleteRes.status).toBe(200);

      const afterDeleteRes = await request(app)
        .get('/api/v1/production/seed-lots/saved-searches')
        .set('Authorization', `Bearer ${token}`);
      expect(afterDeleteRes.body.data.some((s: { id: string }) => s.id === saveRes.body.data.id)).toBe(false);
    });

    it('scopes saved searches per user, and re-saving the same name updates it instead of erroring', async () => {
      const userA = await createTestUser({ role: 'Admin' });
      const userB = await createTestUser({ role: 'Admin' });
      const tokenA = await loginAs(userA);
      const tokenB = await loginAs(userB);
      const name = `Shared Name Search ${uniqueSuffix()}`;

      await request(app)
        .post('/api/v1/production/seed-lots/saved-searches')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name, filters: { crop: 'Rice' } });

      const userBListRes = await request(app)
        .get('/api/v1/production/seed-lots/saved-searches')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(userBListRes.body.data.some((s: { name: string }) => s.name === name)).toBe(false);

      const updateRes = await request(app)
        .post('/api/v1/production/seed-lots/saved-searches')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name, filters: { crop: 'Wheat' } });
      expect(updateRes.status).toBe(201);

      const userAListRes = await request(app)
        .get('/api/v1/production/seed-lots/saved-searches')
        .set('Authorization', `Bearer ${tokenA}`);
      const saved = userAListRes.body.data.filter((s: { name: string }) => s.name === name);
      expect(saved).toHaveLength(1);
      expect(saved[0].filters).toEqual({ crop: 'Wheat' });
    });

    it('rejects saving a search without a name', async () => {
      const user = await createTestUser({ role: 'Admin' });
      const token = await loginAs(user);

      const res = await request(app)
        .post('/api/v1/production/seed-lots/saved-searches')
        .set('Authorization', `Bearer ${token}`)
        .send({ filters: { crop: 'Rice' } });

      expect(res.status).toBe(400);
    });
  });
});
