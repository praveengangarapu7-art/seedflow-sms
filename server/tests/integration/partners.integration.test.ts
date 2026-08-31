import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

async function setupLinkedOrgs() {
  const buyerOrg = await createTestOrganization({ type: 'producer' });
  const partnerOrg = await createTestOrganization({ type: 'breeder' });
  const admin = await createTestUser({ role: 'Admin' });
  const adminToken = await loginAs(admin);

  const linkRes = await request(app)
    .post('/api/v1/partners/links')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ requestingOrgId: buyerOrg.id, partnerOrgId: partnerOrg.id });
  expect(linkRes.status).toBe(201);

  const approveRes = await request(app)
    .post(`/api/v1/partners/links/${linkRes.body.data.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(approveRes.status).toBe(200);

  const buyerUser = await createTestUser({ role: 'Producer', organizationId: buyerOrg.id });
  const partnerUser = await createTestUser({ role: 'Warehouse Manager', organizationId: partnerOrg.id });
  const buyerToken = await loginAs(buyerUser);
  const partnerToken = await loginAs(partnerUser);

  return { buyerOrg, partnerOrg, adminToken, buyerToken, partnerToken };
}

describe('partner integration API', () => {
  it('lists a partner\'s available-for-order Foundation lots in the catalog', async () => {
    const { partnerOrg, buyerToken } = await setupLinkedOrgs();
    const lot = await createTestSeedLot({
      organizationId: partnerOrg.id,
      stage: 'Foundation',
      quantityTotal: 500,
      quantityAllocated: 0,
      availableForPartnerOrder: true,
    });
    // A Foundation lot NOT opted in should not appear.
    await createTestSeedLot({ organizationId: partnerOrg.id, stage: 'Foundation', availableForPartnerOrder: false });

    const res = await request(app).get(`/api/v1/partners/${partnerOrg.id}/catalog`).set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(lot.id);
    expect(res.body.data[0].quantity_available).toBe(500);
  });

  it('auto-confirms an order when the partner has enough available stock, and rejects a duplicate link request', async () => {
    const { buyerOrg, partnerOrg, buyerToken } = await setupLinkedOrgs();
    const lot = await createTestSeedLot({
      organizationId: partnerOrg.id,
      stage: 'Foundation',
      quantityTotal: 500,
      quantityAllocated: 0,
      availableForPartnerOrder: true,
    });

    const orderRes = await request(app)
      .post('/api/v1/partners/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerOrgId: buyerOrg.id, partnerOrgId: partnerOrg.id, seedLotId: lot.id, quantity: 100 });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.status).toBe('confirmed');
    expect(orderRes.body.data.allocation_id).toBeTruthy();
  });

  it('leaves an order "requested" when the partner does not currently have enough stock, then lets the partner manually confirm once true', async () => {
    const { buyerOrg, partnerOrg, buyerToken, partnerToken } = await setupLinkedOrgs();
    const lot = await createTestSeedLot({
      organizationId: partnerOrg.id,
      stage: 'Foundation',
      quantityTotal: 50,
      quantityAllocated: 40, // only 10 available
      availableForPartnerOrder: true,
    });

    const orderRes = await request(app)
      .post('/api/v1/partners/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerOrgId: buyerOrg.id, partnerOrgId: partnerOrg.id, seedLotId: lot.id, quantity: 20 });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.status).toBe('requested');

    // Buyer cannot confirm their own order — only the partner org can.
    const wrongConfirm = await request(app)
      .post(`/api/v1/partners/orders/${orderRes.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(wrongConfirm.status).toBe(403);

    // Still not enough stock — confirming now should fail with a conflict, not silently succeed.
    const prematureConfirm = await request(app)
      .post(`/api/v1/partners/orders/${orderRes.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(prematureConfirm.status).toBe(409);
  });

  it('runs the full ship -> receive lifecycle, decrements the partner\'s stock, creates the buyer a new lot, and computes a performance rating', async () => {
    const { buyerOrg, partnerOrg, buyerToken, partnerToken } = await setupLinkedOrgs();
    const lot = await createTestSeedLot({
      organizationId: partnerOrg.id,
      stage: 'Foundation',
      quantityTotal: 500,
      quantityAllocated: 0,
      availableForPartnerOrder: true,
    });

    const orderRes = await request(app)
      .post('/api/v1/partners/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerOrgId: buyerOrg.id, partnerOrgId: partnerOrg.id, seedLotId: lot.id, quantity: 100 });
    expect(orderRes.body.data.status).toBe('confirmed');
    const orderId = orderRes.body.data.id;

    // The buyer can't ship their own order — only the fulfilling partner org can.
    const wrongShip = await request(app).post(`/api/v1/partners/orders/${orderId}/ship`).set('Authorization', `Bearer ${buyerToken}`);
    expect(wrongShip.status).toBe(403);

    const shipRes = await request(app).post(`/api/v1/partners/orders/${orderId}/ship`).set('Authorization', `Bearer ${partnerToken}`);
    expect(shipRes.status).toBe(200);
    expect(shipRes.body.data.status).toBe('shipped');

    const lotAfterShip = await request(app)
      .get(`/api/v1/production/seed-lots/${lot.id}`)
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(Number(lotAfterShip.body.data.quantity_total)).toBe(400); // 500 - 100 shipped
    expect(Number(lotAfterShip.body.data.quantity_allocated)).toBe(0); // reservation released on ship

    // A Producer with no relation to either org (not the org-agnostic
    // Warehouse Manager role) can't mark receipt on someone else's order.
    const unrelatedOrg = await createTestOrganization();
    const unrelatedProducer = await createTestUser({ role: 'Producer', organizationId: unrelatedOrg.id });
    const unrelatedToken = await loginAs(unrelatedProducer);
    const wrongReceive = await request(app)
      .post(`/api/v1/partners/orders/${orderId}/receive`)
      .set('Authorization', `Bearer ${unrelatedToken}`)
      .send({ qualityRating: 5, onTime: true });
    expect(wrongReceive.status).toBe(403);

    const receiveRes = await request(app)
      .post(`/api/v1/partners/orders/${orderId}/receive`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ qualityRating: 5, onTime: true });
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe('received');
    expect(receiveRes.body.data.received_seed_lot_id).toBeTruthy();

    // The buyer now owns real, usable inventory from this order.
    const receivedLotRes = await request(app)
      .get(`/api/v1/production/seed-lots/${receiveRes.body.data.received_seed_lot_id}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(receivedLotRes.body.data.organization_id).toBe(buyerOrg.id);
    expect(Number(receivedLotRes.body.data.quantity_total)).toBe(100);

    const ratingRes = await request(app)
      .get(`/api/v1/partners/${partnerOrg.id}/rating?buyerOrgId=${buyerOrg.id}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(ratingRes.status).toBe(200);
    expect(ratingRes.body.data.total_orders).toBe(1);
    expect(ratingRes.body.data.fulfilled_orders).toBe(1);
    expect(Number(ratingRes.body.data.avg_quality_rating)).toBe(5);
    expect(ratingRes.body.data.overall_score).not.toBeNull();
  });

  it('blocks ordering across organizations without an active partner link', async () => {
    const buyerOrg = await createTestOrganization();
    const partnerOrg = await createTestOrganization();
    const buyerUser = await createTestUser({ role: 'Producer', organizationId: buyerOrg.id });
    const buyerToken = await loginAs(buyerUser);
    const lot = await createTestSeedLot({
      organizationId: partnerOrg.id,
      stage: 'Foundation',
      quantityTotal: 500,
      availableForPartnerOrder: true,
    });

    const res = await request(app)
      .post('/api/v1/partners/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerOrgId: buyerOrg.id, partnerOrgId: partnerOrg.id, seedLotId: lot.id, quantity: 10 });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/no active partner link/i);
  });

  it('rejects an unauthenticated request to the orders endpoint', async () => {
    const res = await request(app).get('/api/v1/partners/orders');
    expect(res.status).toBe(401);
  });
});
