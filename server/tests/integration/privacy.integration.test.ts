import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestFarmer, createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('privacy API', () => {
  it('masks farmer PII for a role with no operational need (Breeder), but not for Admin', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const breeder = await createTestUser({ role: 'Breeder' });
    const farmer = await createTestFarmer({ name: 'Test Farmer', phone: '5551234567', location: 'Somewhere, ST' });

    const adminToken = await loginAs(admin);
    const breederToken = await loginAs(breeder);

    const adminRes = await request(app).get(`/api/v1/farmers/${farmer.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.body.data.name).toBe('Test Farmer');
    expect(adminRes.body.data.phone).toBe('5551234567');

    const breederRes = await request(app).get(`/api/v1/farmers/${farmer.id}`).set('Authorization', `Bearer ${breederToken}`);
    expect(breederRes.body.data.name).toBe('Test F.');
    expect(breederRes.body.data.phone).toBeNull();
    expect(breederRes.body.data.location).toBeNull();
    // region is not PII on its own and is needed for legitimate aggregate use — stays visible
    expect(breederRes.body.data.region).toBe(farmer.region);
  });

  it('rejects non-Admin access to the privacy dashboard endpoints', async () => {
    const producer = await createTestUser({ role: 'Producer' });
    const token = await loginAs(producer);
    const res = await request(app).get('/api/v1/privacy/compliance-audit').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('requires a reason to anonymize a farmer', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const farmer = await createTestFarmer();

    const res = await request(app)
      .post(`/api/v1/privacy/farmers/${farmer.id}/anonymize`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('anonymizes a farmer, remediates the allocated_to leak, and blocks re-anonymizing', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const farmer = await createTestFarmer({ name: 'Leak Test Farmer' });

    // Simulate the real leak: seedRequests.fulfillRequest / cropPlanning.reserveSeedLot
    // both embed "Farmer: <name>" into an allocation with no FK back to farmers.
    const org = await pool.query(`SELECT id FROM organizations LIMIT 1`);
    const lot = await pool.query(
      `INSERT INTO seed_lots (lot_code, crop, variety, stage, quantity_total, organization_id)
       VALUES ($1, 'Paddy', 'TestVariety', 'Certified', 100, $2) RETURNING id`,
      [`SL-PRIVACY-TEST-${Date.now()}`, org.rows[0].id],
    );
    const allocation = await pool.query(
      `INSERT INTO seed_lot_allocations (seed_lot_id, allocated_to, quantity, performed_by)
       VALUES ($1, $2, 10, 'test@example.com') RETURNING id`,
      [lot.rows[0].id, `Farmer: ${farmer.name}`],
    );

    const res = await request(app)
      .post(`/api/v1/privacy/farmers/${farmer.id}/anonymize`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Right to forget request' });
    expect(res.status).toBe(200);

    const updatedFarmer = await pool.query('SELECT * FROM farmers WHERE id = $1', [farmer.id]);
    expect(updatedFarmer.rows[0].name).toBe('Anonymized Farmer');
    expect(updatedFarmer.rows[0].phone).toBeNull();
    expect(updatedFarmer.rows[0].anonymized).toBe(true);

    const updatedAllocation = await pool.query('SELECT allocated_to FROM seed_lot_allocations WHERE id = $1', [
      allocation.rows[0].id,
    ]);
    expect(updatedAllocation.rows[0].allocated_to).toBe('Farmer: [ANONYMIZED]');

    const secondAttempt = await request(app)
      .post(`/api/v1/privacy/farmers/${farmer.id}/anonymize`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'again' });
    expect(secondAttempt.status).toBe(409);
  });

  it('exports full farmer data across every linked table', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const farmer = await createTestFarmer();

    const res = await request(app)
      .get(`/api/v1/privacy/farmers/${farmer.id}/export?format=json`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.farmer.id).toBe(farmer.id);
    expect(Array.isArray(res.body.data.seedRequests)).toBe(true);
    expect(Array.isArray(res.body.data.cropPlans)).toBe(true);
  });
});
