import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('crop varieties master data API', () => {
  it('walks a variety through draft -> reviewed -> approved and blocks non-admin approval', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const name = `Variety-${uniqueSuffix()}`;

    const createRes = await request(app)
      .post('/api/v1/crop-varieties')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ name, crop: 'Paddy', description: 'High-yield hybrid' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data).toMatchObject({ name, crop: 'Paddy', status: 'draft' });
    const varietyId = createRes.body.data.id;

    const submitRes = await request(app)
      .post(`/api/v1/crop-varieties/${varietyId}/submit-for-review`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('reviewed');

    const forbiddenApprove = await request(app)
      .post(`/api/v1/crop-varieties/${varietyId}/approve`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(forbiddenApprove.status).toBe(403);

    const approveRes = await request(app)
      .post(`/api/v1/crop-varieties/${varietyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
    expect(approveRes.body.data.approved_by).toBe(admin.email);

    const getRes = await request(app)
      .get(`/api/v1/crop-varieties/${varietyId}`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(getRes.body.data.status).toBe('approved');
  });

  it('lets an Admin create a variety and approve it directly from draft', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const name = `Variety-${uniqueSuffix()}`;

    const createRes = await request(app)
      .post('/api/v1/crop-varieties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, crop: 'Maize' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('draft');
    const varietyId = createRes.body.data.id;

    const approveRes = await request(app)
      .post(`/api/v1/crop-varieties/${varietyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
  });

  it('rejects a reviewed variety back to draft with a reason, and blocks deleting an approved variety', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const name = `Variety-${uniqueSuffix()}`;

    const createRes = await request(app)
      .post('/api/v1/crop-varieties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, crop: 'Cotton' });
    const varietyId = createRes.body.data.id;

    await request(app)
      .post(`/api/v1/crop-varieties/${varietyId}/submit-for-review`)
      .set('Authorization', `Bearer ${adminToken}`);

    const rejectRes = await request(app)
      .post(`/api/v1/crop-varieties/${varietyId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Missing botanical details' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('draft');
    expect(rejectRes.body.data.rejection_reason).toBe('Missing botanical details');

    await request(app)
      .post(`/api/v1/crop-varieties/${varietyId}/submit-for-review`)
      .set('Authorization', `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/v1/crop-varieties/${varietyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const deleteRes = await request(app)
      .delete(`/api/v1/crop-varieties/${varietyId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(409);
  });

  it('supports full CRUD for a draft variety and filtering by status', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const name = `Variety-${uniqueSuffix()}`;

    const createRes = await request(app)
      .post('/api/v1/crop-varieties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, crop: 'Wheat' });
    const varietyId = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/v1/crop-varieties/${varietyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Drought-tolerant' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.description).toBe('Drought-tolerant');

    const filtered = await request(app)
      .get('/api/v1/crop-varieties?status=draft&crop=Wheat')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.some((v: { id: string }) => v.id === varietyId)).toBe(true);

    const deleteRes = await request(app)
      .delete(`/api/v1/crop-varieties/${varietyId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    const afterDelete = await request(app)
      .get(`/api/v1/crop-varieties/${varietyId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterDelete.status).toBe(404);
  });
});
