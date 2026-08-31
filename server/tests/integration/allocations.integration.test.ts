import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('allocation API', () => {
  it('allocates via the real HTTP endpoint and reflects the new available quantity', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot({ quantityTotal: 300, quantityAllocated: 0 });

    const res = await request(app)
      .post(`/api/v1/production/seed-lots/${lot.id}/allocate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 100, allocatedTo: 'Farmer: Integration Test' });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.seedLot.quantity_total)).toBe(300);
    expect(Number(res.body.data.seedLot.quantity_allocated)).toBe(100);
  });

  it('returns 409 when the request exceeds available quantity', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot({ quantityTotal: 50, quantityAllocated: 40 });

    const res = await request(app)
      .post(`/api/v1/production/seed-lots/${lot.id}/allocate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 20, allocatedTo: 'x' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/exceeds available/i);
  });

  it('returns 403 when a Producer targets another organization\'s lot', async () => {
    const producer = await createTestUser({ role: 'Producer' });
    const token = await loginAs(producer);
    const lot = await createTestSeedLot(); // owned by a freshly-created, different org

    const res = await request(app)
      .post(`/api/v1/production/seed-lots/${lot.id}/allocate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5, allocatedTo: 'x' });

    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated allocation attempt', async () => {
    const lot = await createTestSeedLot();
    const res = await request(app).post(`/api/v1/production/seed-lots/${lot.id}/allocate`).send({ quantity: 5, allocatedTo: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('batch allocation API', () => {
  it('allocates from multiple lots to multiple destinations in one request', async () => {
    const org = await createTestOrganization();
    const admin = await createTestUser({ role: 'Admin', organizationId: null });
    const token = await loginAs(admin);
    const lotA = await createTestSeedLot({ organizationId: org.id, quantityTotal: 100, quantityAllocated: 0 });
    const lotB = await createTestSeedLot({ organizationId: org.id, quantityTotal: 200, quantityAllocated: 0 });

    const res = await request(app)
      .post('/api/v1/production/allocations/bulk-allocate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        requests: [
          { seedLotId: lotA.id, quantity: 40, allocatedTo: 'Crop Plan A', cropPlanId: 'plan-a' },
          { seedLotId: lotB.id, quantity: 90, allocatedTo: 'Crop Plan B', cropPlanId: 'plan-b' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.allocated).toBe(2);
    expect(res.body.data.results[0]).toMatchObject({ status: 'allocated', seedLotId: lotA.id });
    expect(res.body.data.results[1]).toMatchObject({ status: 'allocated', seedLotId: lotB.id });
    expect(Number(res.body.data.results[0].seedLot.quantity_allocated)).toBe(40);
    expect(Number(res.body.data.results[1].seedLot.quantity_allocated)).toBe(90);
  });

  it('resolves a conflict when two requests on the same lot exceed what is available, first-come-first-served', async () => {
    const org = await createTestOrganization();
    const admin = await createTestUser({ role: 'Admin', organizationId: null });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot({ organizationId: org.id, quantityTotal: 100, quantityAllocated: 0 });

    const res = await request(app)
      .post('/api/v1/production/allocations/bulk-allocate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        requests: [
          { seedLotId: lot.id, quantity: 70, allocatedTo: 'Crop Plan A' },
          { seedLotId: lot.id, quantity: 70, allocatedTo: 'Crop Plan B' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.allocated).toBe(1);
    expect(res.body.data.skipped).toBe(1);
    expect(res.body.data.results[0].status).toBe('allocated');
    expect(res.body.data.results[1]).toMatchObject({ status: 'skipped', reason: 'insufficient_available_quantity' });

    const lotAfter = await request(app)
      .get(`/api/v1/production/seed-lots/${lot.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(Number(lotAfter.body.data.quantity_allocated)).toBe(70);
  });

  it('reports a per-item failure for an unknown seed lot without failing the whole batch', async () => {
    const org = await createTestOrganization();
    const admin = await createTestUser({ role: 'Admin', organizationId: null });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot({ organizationId: org.id, quantityTotal: 100, quantityAllocated: 0 });

    const res = await request(app)
      .post('/api/v1/production/allocations/bulk-allocate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        requests: [
          { seedLotId: '00000000-0000-0000-0000-000000000000', quantity: 10, allocatedTo: 'x' },
          { seedLotId: lot.id, quantity: 10, allocatedTo: 'y' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.results[0]).toMatchObject({ status: 'skipped', reason: 'seed_lot_not_found' });
    expect(res.body.data.results[1].status).toBe('allocated');
  });

  it('rejects a request item with a non-positive quantity as a per-item failure', async () => {
    const org = await createTestOrganization();
    const admin = await createTestUser({ role: 'Admin', organizationId: null });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot({ organizationId: org.id, quantityTotal: 100, quantityAllocated: 0 });

    const res = await request(app)
      .post('/api/v1/production/allocations/bulk-allocate')
      .set('Authorization', `Bearer ${token}`)
      .send({ requests: [{ seedLotId: lot.id, quantity: 0, allocatedTo: 'x' }] });

    expect(res.status).toBe(200);
    expect(res.body.data.results[0]).toMatchObject({ status: 'failed' });
    expect(res.body.data.results[0].error).toMatch(/positive/);
  });

  it('rejects an empty batch allocation request', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);

    const res = await request(app)
      .post('/api/v1/production/allocations/bulk-allocate')
      .set('Authorization', `Bearer ${token}`)
      .send({ requests: [] });

    expect(res.status).toBe(400);
  });
});
