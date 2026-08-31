import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('crops master data API', () => {
  it('lets an Admin create, list, update, and delete a crop, and blocks a non-admin role', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const name = `Crop-${uniqueSuffix()}`;

    const forbidden = await request(app)
      .post('/api/v1/crops')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name, category: 'Food Grain', season: 'Kharif' });
    expect(forbidden.status).toBe(403);

    const invalidCategory = await request(app)
      .post('/api/v1/crops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, category: 'Not A Real Category', season: 'Kharif' });
    expect(invalidCategory.status).toBe(400);

    const createRes = await request(app)
      .post('/api/v1/crops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, category: 'Food Grain', season: 'Kharif' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data).toMatchObject({ name, category: 'Food Grain', season: 'Kharif', active: true });
    const cropId = createRes.body.data.id;

    const listRes = await request(app).get('/api/v1/crops').set('Authorization', `Bearer ${producerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((c: { id: string }) => c.id === cropId)).toBe(true);

    const getRes = await request(app).get(`/api/v1/crops/${cropId}`).set('Authorization', `Bearer ${producerToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe(name);

    const updateRes = await request(app)
      .put(`/api/v1/crops/${cropId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ season: 'Rabi', active: false });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data).toMatchObject({ season: 'Rabi', active: false, name });

    const deleteRes = await request(app).delete(`/api/v1/crops/${cropId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    const afterDelete = await request(app).get(`/api/v1/crops/${cropId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(afterDelete.status).toBe(404);
  });

  it('supports filtering the crop list by active status', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const activeName = `Crop-Active-${uniqueSuffix()}`;
    const inactiveName = `Crop-Inactive-${uniqueSuffix()}`;

    await request(app)
      .post('/api/v1/crops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: activeName, category: 'Vegetable', season: 'Summer', active: true });
    await request(app)
      .post('/api/v1/crops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: inactiveName, category: 'Vegetable', season: 'Summer', active: false });

    const activeOnly = await request(app).get('/api/v1/crops?active=true').set('Authorization', `Bearer ${adminToken}`);
    expect(activeOnly.body.data.some((c: { name: string }) => c.name === activeName)).toBe(true);
    expect(activeOnly.body.data.some((c: { name: string }) => c.name === inactiveName)).toBe(false);
  });
});
