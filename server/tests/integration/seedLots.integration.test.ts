import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('seed lots API', () => {
  it('creates a lot for the caller\'s own organization (Breeder)', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);

    const res = await request(app)
      .post('/api/v1/production/seed-lots')
      .set('Authorization', `Bearer ${token}`)
      .send({ lotCode: `SL-INT-${Date.now()}`, crop: 'Paddy', variety: 'IntegrationVariety', quantityTotal: 500 });

    expect(res.status).toBe(201);
    expect(res.body.data.organization_id).toBe(breeder.organizationId);
    expect(res.body.data.quantity_available).toBe(500);
  });

  it('rejects creation from a role not allowed to create lots (Inspector)', async () => {
    const inspector = await createTestUser({ role: 'Inspector' });
    const token = await loginAs(inspector);

    const res = await request(app)
      .post('/api/v1/production/seed-lots')
      .set('Authorization', `Bearer ${token}`)
      .send({ lotCode: `SL-INT-${Date.now()}`, crop: 'Paddy', variety: 'X', quantityTotal: 10 });

    expect(res.status).toBe(403);
  });

  it('returns 400 (not 500) for a malformed lot id', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);

    const res = await request(app)
      .get('/api/v1/production/seed-lots/not-a-valid-uuid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns a clean 409 (not a raw constraint-violation message) for a duplicate lot code', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);
    const lotCode = `SL-DUP-${Date.now()}`;

    const first = await request(app)
      .post('/api/v1/production/seed-lots')
      .set('Authorization', `Bearer ${token}`)
      .send({ lotCode, crop: 'Paddy', variety: 'DupTest', quantityTotal: 10 });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/production/seed-lots')
      .set('Authorization', `Bearer ${token}`)
      .send({ lotCode, crop: 'Paddy', variety: 'DupTest2', quantityTotal: 20 });

    expect(second.status).toBe(409);
    expect(second.body.message).toBe(`Seed lot code "${lotCode}" already exists`);
  });

  it('returns 409 (not a 500) deleting a lot created via the real API, which always has hash-chain history', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);

    const createRes = await request(app)
      .post('/api/v1/production/seed-lots')
      .set('Authorization', `Bearer ${token}`)
      .send({ lotCode: `SL-DEL-${Date.now()}`, crop: 'Paddy', variety: 'DeleteTest', quantityTotal: 10 });
    expect(createRes.status).toBe(201);

    const deleteRes = await request(app)
      .delete(`/api/v1/production/seed-lots/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(409);
    expect(deleteRes.body.message).toMatch(/hash chain/i);
  });

  it('returns 404 for a well-formed but non-existent lot id', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);

    const res = await request(app)
      .get('/api/v1/production/seed-lots/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('filters the list by crop', async () => {
    const org = await createTestOrganization();
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const uniqueCrop = `IntegrationCrop-${Date.now()}`;
    await createTestSeedLot({ organizationId: org.id, crop: uniqueCrop });
    await createTestSeedLot({ organizationId: org.id, crop: 'Maize' });

    const res = await request(app)
      .get(`/api/v1/production/seed-lots?crop=${encodeURIComponent(uniqueCrop)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((lot: { crop: string }) => lot.crop === uniqueCrop)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('honors limit and offset for pagination', async () => {
    const org = await createTestOrganization();
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const uniqueCrop = `PageCrop-${Date.now()}`;
    const lots = await Promise.all(
      Array.from({ length: 5 }, () => createTestSeedLot({ organizationId: org.id, crop: uniqueCrop })),
    );

    const firstPage = await request(app)
      .get(`/api/v1/production/seed-lots?crop=${encodeURIComponent(uniqueCrop)}&limit=2`)
      .set('Authorization', `Bearer ${token}`);
    expect(firstPage.body.data).toHaveLength(2);

    const secondPage = await request(app)
      .get(`/api/v1/production/seed-lots?crop=${encodeURIComponent(uniqueCrop)}&limit=2&offset=2`)
      .set('Authorization', `Bearer ${token}`);
    expect(secondPage.body.data).toHaveLength(2);

    const firstIds = firstPage.body.data.map((lot: { id: string }) => lot.id);
    const secondIds = secondPage.body.data.map((lot: { id: string }) => lot.id);
    expect(firstIds.some((id: string) => secondIds.includes(id))).toBe(false);

    const unpaginated = await request(app)
      .get(`/api/v1/production/seed-lots?crop=${encodeURIComponent(uniqueCrop)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(unpaginated.body.data).toHaveLength(lots.length);
  });
});

describe('seed lots bulk operations API', () => {
  it('bulk-creates lots, reporting each row independently (partial success)', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);
    const suffix = Date.now();

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { lotCode: `SL-BULK-${suffix}-A`, crop: 'Paddy', variety: 'BulkA', quantityTotal: 100 },
          { crop: 'Paddy', variety: 'MissingLotCode', quantityTotal: 100 }, // invalid: no lotCode
          { lotCode: `SL-BULK-${suffix}-B`, crop: 'Paddy', variety: 'BulkB', quantityTotal: 200 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0]).toMatchObject({ index: 0, status: 'created' });
    expect(res.body.data.results[1]).toMatchObject({ index: 1, status: 'failed' });
    expect(res.body.data.results[2]).toMatchObject({ index: 2, status: 'created' });
    expect(res.body.data.results[0].data.organization_id).toBe(breeder.organizationId);
  });

  it('reports a clean per-item conflict for a duplicate lot code within a bulk-create batch', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);
    const lotCode = `SL-BULK-DUP-${Date.now()}`;
    await request(app)
      .post('/api/v1/production/seed-lots')
      .set('Authorization', `Bearer ${token}`)
      .send({ lotCode, crop: 'Paddy', variety: 'Existing', quantityTotal: 10 });

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-create')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ lotCode, crop: 'Paddy', variety: 'Duplicate', quantityTotal: 20 }] });

    expect(res.status).toBe(200);
    expect(res.body.data.results[0]).toMatchObject({ status: 'failed', error: `Seed lot code "${lotCode}" already exists` });
  });

  it('rejects a bulk-create request with zero items', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-create')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] });

    expect(res.status).toBe(400);
  });

  it('bulk-updates lots independently, reporting a failure for a non-existent id', async () => {
    const org = await createTestOrganization();
    const admin = await createTestUser({ role: 'Admin', organizationId: null });
    const token = await loginAs(admin);
    const lotA = await createTestSeedLot({ organizationId: org.id });
    const lotB = await createTestSeedLot({ organizationId: org.id });

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-update')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { id: lotA.id, updates: { notes: 'after' } },
          { id: '00000000-0000-0000-0000-000000000000', updates: { notes: 'after' } },
          { id: lotB.id, updates: { notes: 'after' } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0].data.notes).toBe('after');
    expect(res.body.data.results[1].status).toBe('failed');
  });

  it('bulk-deletes lots independently, reporting a conflict for a lot with allocations', async () => {
    const org = await createTestOrganization();
    const admin = await createTestUser({ role: 'Admin', organizationId: null });
    const token = await loginAs(admin);
    const deletable = await createTestSeedLot({ organizationId: org.id });
    const withAllocation = await createTestSeedLot({ organizationId: org.id, quantityTotal: 100, quantityAllocated: 20 });
    await request(app)
      .post(`/api/v1/production/seed-lots/${withAllocation.id}/allocate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1, allocatedTo: 'x' });

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [deletable.id, withAllocation.id] });

    expect(res.status).toBe(200);
    expect(res.body.data.results[0]).toMatchObject({ status: 'deleted' });
    expect(res.body.data.results[1].status).toBe('failed');
    expect(res.body.data.results[1].error).toMatch(/allocation record/i);
  });

  it('imports seed lots from CSV text, reporting per-row outcomes with 1-indexed row numbers', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);
    const suffix = Date.now();
    const csvText =
      'lotCode,crop,variety,quantityTotal\n' +
      `SL-CSV-${suffix}-A,Paddy,CsvVarietyA,150\n` +
      'SL-CSV-MISSING,Paddy,CsvVarietyB,not-a-number\n' +
      `SL-CSV-${suffix}-C,Paddy,CsvVarietyC,250\n`;

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-import-csv')
      .set('Authorization', `Bearer ${token}`)
      .send({ csvText });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.results[0]).toMatchObject({ rowNumber: 2, status: 'created' });
    expect(res.body.data.results[1]).toMatchObject({ rowNumber: 3, status: 'failed' });
    expect(res.body.data.results[1].error).toMatch(/quantityTotal/);
    expect(res.body.data.results[2]).toMatchObject({ rowNumber: 4, status: 'created' });
  });

  it('rejects a CSV import with no header row', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-import-csv')
      .set('Authorization', `Bearer ${token}`)
      .send({ csvText: '' });

    expect(res.status).toBe(400);
  });

  it('rejects bulk operations from a role not allowed to write seed lots (Inspector)', async () => {
    const inspector = await createTestUser({ role: 'Inspector' });
    const token = await loginAs(inspector);

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-create')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ lotCode: 'x', crop: 'Paddy', variety: 'y', quantityTotal: 1 }] });

    expect(res.status).toBe(403);
  });
});
