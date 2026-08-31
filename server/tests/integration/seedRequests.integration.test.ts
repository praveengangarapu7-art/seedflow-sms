import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestFarmer, createTestSeedLot, createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('farmer-centric seed allocation & distribution API (Extend #9)', () => {
  it('lets a farmer request a specific seed lot (Farmer Portal cart flow), and Admin approving it allocates that lot immediately — Ready for Pickup', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const farmer = await createTestFarmer({ region: `Region-${suffix}` });
    const crop = `Paddy-${suffix}`;
    const variety = `Gold-${suffix}`;
    const lot = await createTestSeedLot({ crop, variety, quantityTotal: 500, quantityAllocated: 0 });

    const createRes = await request(app)
      .post('/api/v1/production/seed-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmerId: farmer.id, crop, variety, quantity: 50, seedLotId: lot.id });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('requested');
    expect(createRes.body.data.requested_seed_lot_id).toBe(lot.id);
    const requestId = createRes.body.data.id;

    // Before approval: the cart choice is already visible in "My Allocations".
    const preApprovalRes = await request(app)
      .get(`/api/v1/production/seed-requests/my-allocations?farmerId=${farmer.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(preApprovalRes.status).toBe(200);
    const preEntry = preApprovalRes.body.data.find((r: { id: string }) => r.id === requestId);
    expect(preEntry.lot_code).toBe(lot.lot_code);
    expect(preEntry.ready_since).toBeNull();

    const approveRes = await request(app)
      .post(`/api/v1/production/seed-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('allocated');
    expect(approveRes.body.data.allocation_id).toBeTruthy();

    const lotAfter = await pool.query('SELECT quantity_allocated FROM seed_lots WHERE id = $1', [lot.id]);
    expect(Number(lotAfter.rows[0].quantity_allocated)).toBe(50);

    const afterApprovalRes = await request(app)
      .get(`/api/v1/production/seed-requests/my-allocations?farmerId=${farmer.id}`)
      .set('Authorization', `Bearer ${token}`);
    const afterEntry = afterApprovalRes.body.data.find((r: { id: string }) => r.id === requestId);
    expect(afterEntry.status).toBe('allocated');
    expect(afterEntry.lot_code).toBe(lot.lot_code);
    expect(afterEntry.ready_since).toBeTruthy();
  });

  it('does not let a Producer auto-allocate real inventory just by approving a cart-originated request', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const producer = await createTestUser({ role: 'Producer' });
    const adminToken = await loginAs(admin);
    const producerToken = await loginAs(producer);
    const suffix = uniqueSuffix();
    const farmer = await createTestFarmer();
    const crop = `Wheat-${suffix}`;
    const variety = `Durum-${suffix}`;
    const lot = await createTestSeedLot({ crop, variety, quantityTotal: 500, quantityAllocated: 0 });

    const createRes = await request(app)
      .post('/api/v1/production/seed-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ farmerId: farmer.id, crop, variety, quantity: 20, seedLotId: lot.id });
    const requestId = createRes.body.data.id;

    const approveRes = await request(app)
      .post(`/api/v1/production/seed-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${producerToken}`);
    expect(approveRes.status).toBe(200);
    // Producer can approve, but not fulfill — so it stops at "approved",
    // not "allocated". No real inventory should move.
    expect(approveRes.body.data.status).toBe('approved');

    const lotAfter = await pool.query('SELECT quantity_allocated FROM seed_lots WHERE id = $1', [lot.id]);
    expect(Number(lotAfter.rows[0].quantity_allocated)).toBe(0);
  });

  it('leaves the older crop/variety-only request flow unchanged: approve stops at "approved" until a staff member separately fulfills it', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const farmer = await createTestFarmer();
    const crop = `Maize-${suffix}`;
    const variety = `Sweet-${suffix}`;
    const lot = await createTestSeedLot({ crop, variety, quantityTotal: 500, quantityAllocated: 0 });

    const createRes = await request(app)
      .post('/api/v1/production/seed-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmerId: farmer.id, crop, variety, quantity: 30 });
    expect(createRes.body.data.requested_seed_lot_id).toBeNull();
    const requestId = createRes.body.data.id;

    const approveRes = await request(app)
      .post(`/api/v1/production/seed-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(approveRes.body.data.status).toBe('approved');

    const fulfillRes = await request(app)
      .post(`/api/v1/production/seed-requests/${requestId}/fulfill`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: lot.id });
    expect(fulfillRes.status).toBe(200);
    expect(fulfillRes.body.data.status).toBe('allocated');
  });

  it('rejects (denies) a pending request with a reason, and rejects request creation when the given seed lot is the wrong crop/variety', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const farmer = await createTestFarmer();
    const crop = `Barley-${suffix}`;
    const variety = `Six-Row-${suffix}`;
    const lot = await createTestSeedLot({ crop, variety, quantityTotal: 500, quantityAllocated: 0 });

    const wrongCropRes = await request(app)
      .post('/api/v1/production/seed-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmerId: farmer.id, crop: `NotTheCrop-${suffix}`, variety, quantity: 10, seedLotId: lot.id });
    expect(wrongCropRes.status).toBe(400);

    const createRes = await request(app)
      .post('/api/v1/production/seed-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmerId: farmer.id, crop, variety, quantity: 10, seedLotId: lot.id });
    const requestId = createRes.body.data.id;

    const denyRes = await request(app)
      .post(`/api/v1/production/seed-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Out of season for this region' });
    expect(denyRes.status).toBe(200);
    expect(denyRes.body.data.status).toBe('rejected');
    expect(denyRes.body.data.rejection_reason).toBe('Out of season for this region');
  });
});
