import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('batch operations for seed lots (Extend: Batch Operations for Seed Lots)', () => {
  it('moves multiple lots to a storage zone in one request, all succeeding together', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lotA = await createTestSeedLot();
    const lotB = await createTestSeedLot();

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-quick-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'move_zone', ids: [lotA.id, lotB.id], zone: 'Zone C' });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.failed).toBe(0);

    const rows = await pool.query('SELECT id, storage_zone FROM seed_lots WHERE id = ANY($1)', [[lotA.id, lotB.id]]);
    for (const row of rows.rows) {
      expect(row.storage_zone).toBe('Zone C');
    }

    const auditRows = await pool.query(
      "SELECT entity_id FROM audit_logs WHERE entity_type = 'seed_lot' AND action = 'UPDATE' AND entity_id = ANY($1)",
      [[lotA.id, lotB.id]],
    );
    expect(auditRows.rows.length).toBe(2);
  });

  it('marks lots approved for sale and, separately, expired — as two independent boolean/status flags', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot();

    const approveRes = await request(app)
      .post('/api/v1/production/seed-lots/bulk-quick-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve_for_sale', ids: [lot.id] });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.succeeded).toBe(1);

    let row = await pool.query('SELECT approved_for_sale, status FROM seed_lots WHERE id = $1', [lot.id]);
    expect(row.rows[0].approved_for_sale).toBe(true);
    expect(row.rows[0].status).toBe('active');

    const expireRes = await request(app)
      .post('/api/v1/production/seed-lots/bulk-quick-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'mark_expired', ids: [lot.id] });
    expect(expireRes.status).toBe(200);
    expect(expireRes.body.data.succeeded).toBe(1);

    row = await pool.query('SELECT approved_for_sale, status FROM seed_lots WHERE id = $1', [lot.id]);
    expect(row.rows[0].status).toBe('expired');
    // approved_for_sale is untouched by the mark_expired action.
    expect(row.rows[0].approved_for_sale).toBe(true);
  });

  it('lets other items in the batch succeed when one item is a lot outside the caller\'s organization', async () => {
    const orgA = await createTestOrganization();
    const breeder = await createTestUser({ role: 'Breeder', organizationId: orgA.id });
    const token = await loginAs(breeder);
    const ownLot = await createTestSeedLot({ organizationId: orgA.id });
    const otherOrgLot = await createTestSeedLot(); // its own separate organization

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-quick-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve_for_sale', ids: [ownLot.id, otherOrgLot.id] });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(1);
    expect(res.body.data.failed).toBe(1);
    const failedItem = res.body.data.results.find((r: { seedLotId: string }) => r.seedLotId === otherOrgLot.id);
    expect(failedItem.status).toBe('failed');
    expect(failedItem.error).toMatch(/organization/i);

    const otherRow = await pool.query('SELECT approved_for_sale FROM seed_lots WHERE id = $1', [otherOrgLot.id]);
    expect(otherRow.rows[0].approved_for_sale).toBe(false);
  });

  it('rejects an unknown action and an empty id list', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot();

    const badActionRes = await request(app)
      .post('/api/v1/production/seed-lots/bulk-quick-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'delete_everything', ids: [lot.id] });
    expect(badActionRes.status).toBe(400);

    const emptyRes = await request(app)
      .post('/api/v1/production/seed-lots/bulk-quick-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve_for_sale', ids: [] });
    expect(emptyRes.status).toBe(400);
  });

  it('prints labels without mutating the lots, and logs a PRINT_LABELS audit entry for each', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot({ crop: 'Paddy', variety: 'GoldenPaddy' });
    const before = await pool.query('SELECT status, updated_at FROM seed_lots WHERE id = $1', [lot.id]);

    const res = await request(app)
      .post('/api/v1/production/seed-lots/bulk-print-labels')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [lot.id], actionId: 'test-print-1' });

    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(1);
    expect(res.body.data.results[0].lotCode).toBe(lot.lot_code);
    expect(res.body.data.results[0].crop).toBe('Paddy');
    expect(res.body.data.results[0].variety).toBe('GoldenPaddy');

    const after = await pool.query('SELECT status, updated_at FROM seed_lots WHERE id = $1', [lot.id]);
    expect(after.rows[0].status).toBe(before.rows[0].status);

    const auditRows = await pool.query(
      "SELECT entity_id, action FROM audit_logs WHERE entity_type = 'seed_lot' AND action = 'PRINT_LABELS' AND entity_id = $1",
      [lot.id],
    );
    expect(auditRows.rows.length).toBe(1);
  });

  it('lets Warehouse Manager print labels but not move/approve/expire lots (role-gated separately from print)', async () => {
    const warehouseManager = await createTestUser({ role: 'Warehouse Manager', organizationId: null });
    const token = await loginAs(warehouseManager);
    const lot = await createTestSeedLot();

    const printRes = await request(app)
      .post('/api/v1/production/seed-lots/bulk-print-labels')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [lot.id] });
    expect(printRes.status).toBe(200);

    const quickActionRes = await request(app)
      .post('/api/v1/production/seed-lots/bulk-quick-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve_for_sale', ids: [lot.id] });
    expect(quickActionRes.status).toBe(403);
  });
});
