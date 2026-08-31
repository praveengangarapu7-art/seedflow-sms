import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestUser, createTestCrop, createTestOrganization, createTestFarmer } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('master data reconciliation API', () => {
  it('flags a farmer missing an email', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const farmer = await createTestFarmer(); // factory never sets email — comes back NULL

    const res = await request(app).post('/api/v1/master-data/reconcile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(
      res.body.data.issues.some(
        (issue: { entityId: string; rule: string }) => issue.entityId === farmer.id && issue.rule === 'farmer_email_required',
      ),
    ).toBe(true);
  });

  it('flags a laboratory missing a certification type', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lab = await createTestOrganization({ type: 'laboratory' }); // factory never sets certification_type

    const res = await request(app).post('/api/v1/master-data/reconcile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(
      res.body.data.issues.some(
        (issue: { entityId: string; rule: string }) =>
          issue.entityId === lab.id && issue.rule === 'lab_certification_type_required',
      ),
    ).toBe(true);
  });

  it('flags an active crop with no approved variety, and clears once one is approved', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const crop = await createTestCrop({ active: true });

    const before = await request(app).post('/api/v1/master-data/reconcile').set('Authorization', `Bearer ${token}`);
    expect(
      before.body.data.issues.some(
        (issue: { entityId: string; rule: string }) =>
          issue.entityId === crop.id && issue.rule === 'crop_missing_approved_variety',
      ),
    ).toBe(true);

    const varietyResult = await pool.query<{ id: string }>(
      `INSERT INTO crop_varieties (name, crop, created_by, status)
       VALUES ($1, $2, $3, 'approved') RETURNING id`,
      [`Variety-${uniqueSuffix()}`, crop.name, admin.email],
    );
    expect(varietyResult.rows[0]).toBeDefined();

    const after = await request(app).post('/api/v1/master-data/reconcile').set('Authorization', `Bearer ${token}`);
    expect(
      after.body.data.issues.some(
        (issue: { entityId: string; rule: string }) =>
          issue.entityId === crop.id && issue.rule === 'crop_missing_approved_variety',
      ),
    ).toBe(false);
  });

  it('flags a variety referencing a crop name that is not in the crop catalog', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const unknownCropName = `NoSuchCrop-${uniqueSuffix()}`;

    const varietyResult = await pool.query<{ id: string }>(
      `INSERT INTO crop_varieties (name, crop, created_by, status) VALUES ($1, $2, $3, 'draft') RETURNING id`,
      [`Variety-${uniqueSuffix()}`, unknownCropName, admin.email],
    );
    const varietyId = varietyResult.rows[0].id;

    const res = await request(app).post('/api/v1/master-data/reconcile').set('Authorization', `Bearer ${token}`);
    expect(
      res.body.data.issues.some(
        (issue: { entityId: string; rule: string }) => issue.entityId === varietyId && issue.rule === 'variety_unknown_crop',
      ),
    ).toBe(true);
  });
});
