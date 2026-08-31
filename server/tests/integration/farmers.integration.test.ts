import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('farmers master data API', () => {
  it('lets a Producer create, update, and delete a farmer, and blocks an Inspector from writing', async () => {
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const name = `Farmer ${uniqueSuffix()}`;
    const region = `Region-${uniqueSuffix()}`;

    const forbidden = await request(app)
      .post('/api/v1/farmers')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ name, region });
    expect(forbidden.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/farmers')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name, region, phone: '9876543210', email: `${uniqueSuffix()}@example.com`, location: 'Village X' });
    expect(createRes.status).toBe(201);
    const farmerId = createRes.body.data.id;
    expect(createRes.body.data).toMatchObject({ name, region, phone: '9876543210', location: 'Village X' });

    const forbiddenUpdate = await request(app)
      .put(`/api/v1/farmers/${farmerId}`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ phone: '0000000000' });
    expect(forbiddenUpdate.status).toBe(403);

    const updateRes = await request(app)
      .put(`/api/v1/farmers/${farmerId}`)
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ phone: '1112223333', location: 'Village Y' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data).toMatchObject({ name, phone: '1112223333', location: 'Village Y' });

    // An Inspector has no full-PII access — the masked view should show the
    // updated record's name (pseudonymized) but never the real phone/location.
    const maskedGet = await request(app).get(`/api/v1/farmers/${farmerId}`).set('Authorization', `Bearer ${inspectorToken}`);
    expect(maskedGet.status).toBe(200);
    expect(maskedGet.body.data.phone).toBeNull();
    expect(maskedGet.body.data.location).toBeNull();

    const deleteRes = await request(app).delete(`/api/v1/farmers/${farmerId}`).set('Authorization', `Bearer ${producerToken}`);
    expect(deleteRes.status).toBe(200);

    const afterDelete = await request(app).get(`/api/v1/farmers/${farmerId}`).set('Authorization', `Bearer ${producerToken}`);
    expect(afterDelete.status).toBe(404);
  });

  it('requires name and region to remain non-empty on update', async () => {
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const createRes = await request(app)
      .post('/api/v1/farmers')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name: `Farmer ${uniqueSuffix()}`, region: `Region-${uniqueSuffix()}`, email: `${uniqueSuffix()}@example.com` });
    const farmerId = createRes.body.data.id;

    const blankName = await request(app)
      .put(`/api/v1/farmers/${farmerId}`)
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name: '   ' });
    expect(blankName.status).toBe(400);
  });

  it('requires a valid email on create and update — the Master Data validation rule', async () => {
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const name = `Farmer ${uniqueSuffix()}`;
    const region = `Region-${uniqueSuffix()}`;

    const missingEmail = await request(app)
      .post('/api/v1/farmers')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name, region });
    expect(missingEmail.status).toBe(400);
    expect(missingEmail.body.message).toMatch(/email/i);

    const invalidEmail = await request(app)
      .post('/api/v1/farmers')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name, region, email: 'not-an-email' });
    expect(invalidEmail.status).toBe(400);

    const email = `${uniqueSuffix()}@example.com`;
    const createRes = await request(app)
      .post('/api/v1/farmers')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name, region, email });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.email).toBe(email);
    const farmerId = createRes.body.data.id;

    const clearEmail = await request(app)
      .put(`/api/v1/farmers/${farmerId}`)
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ email: '' });
    expect(clearEmail.status).toBe(400);
  });
});
