import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('organizations master data API', () => {
  it('lets an Admin create, update, and delete an organization with location/contact fields, and blocks a non-admin role', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const name = `Org-${uniqueSuffix()}`;

    const forbidden = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name, type: 'laboratory' });
    expect(forbidden.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name,
        type: 'laboratory',
        location: 'Bengaluru, Karnataka',
        contactPerson: 'Dr. Anil Sharma',
        certificationType: 'ISTA Accredited',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data).toMatchObject({
      name,
      type: 'laboratory',
      location: 'Bengaluru, Karnataka',
      contact_person: 'Dr. Anil Sharma',
      certification_type: 'ISTA Accredited',
      active: true,
    });
    const orgId = createRes.body.data.id;

    const getRes = await request(app).get(`/api/v1/organizations/${orgId}`).set('Authorization', `Bearer ${producerToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe(name);

    const updateRes = await request(app)
      .put(`/api/v1/organizations/${orgId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false, contactPerson: 'Dr. Priya Rao' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data).toMatchObject({ active: false, contact_person: 'Dr. Priya Rao', type: 'laboratory' });

    const deleteRes = await request(app).delete(`/api/v1/organizations/${orgId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    const afterDelete = await request(app).get(`/api/v1/organizations/${orgId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(afterDelete.status).toBe(404);
  });

  it('filters the organization list by type, e.g. to derive the laboratory directory', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const labName = `Lab-${uniqueSuffix()}`;
    const breederName = `Breeder-${uniqueSuffix()}`;

    await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${adminToken}`).send({ name: labName, type: 'laboratory', certificationType: 'ISTA Accredited' });
    await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${adminToken}`).send({ name: breederName, type: 'breeder' });

    const labsRes = await request(app).get('/api/v1/organizations?type=laboratory').set('Authorization', `Bearer ${adminToken}`);
    expect(labsRes.status).toBe(200);
    expect(labsRes.body.data.every((org: { type: string }) => org.type === 'laboratory')).toBe(true);
    expect(labsRes.body.data.some((org: { name: string }) => org.name === labName)).toBe(true);
    expect(labsRes.body.data.some((org: { name: string }) => org.name === breederName)).toBe(false);
  });

  it('requires certificationType for a laboratory but not for other organization types', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);

    const missingCert = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Lab-${uniqueSuffix()}`, type: 'laboratory' });
    expect(missingCert.status).toBe(400);
    expect(missingCert.body.message).toMatch(/certificationType/i);

    const breederNoCert = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Breeder-${uniqueSuffix()}`, type: 'breeder' });
    expect(breederNoCert.status).toBe(201);

    const labWithCert = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Lab-${uniqueSuffix()}`, type: 'laboratory', certificationType: 'NABL Accredited' });
    expect(labWithCert.status).toBe(201);
    const labId = labWithCert.body.data.id;

    // Switching an existing lab's certification back out is blocked the same way.
    const clearCert = await request(app)
      .put(`/api/v1/organizations/${labId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ certificationType: '' });
    expect(clearCert.status).toBe(400);
  });
});
