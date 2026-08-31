import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('seed lot genealogy API', () => {
  it('returns the ancestor path, descendants, and test submissions for a lot', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);

    const parent = await createTestSeedLot({ organizationId: breeder.organizationId!, stage: 'Foundation' });
    const child = await createTestSeedLot({
      organizationId: breeder.organizationId!,
      stage: 'Certified',
      parentLotId: parent.id,
      crop: parent.crop,
    });

    const lab = await createTestOrganization({ type: 'laboratory' });
    const submitRes = await request(app)
      .post('/api/v1/production/lab-testing/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: child.id, labOrganizationId: lab.id, requestedTests: ['germination'], sampleQuantity: 25 });
    expect(submitRes.status).toBe(201);

    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    await request(app)
      .post(`/api/v1/production/lab-testing/submissions/${submitRes.body.data.id}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testType: 'germination', metrics: { sampleSize: 100, germinatedCount: 92 } }); // 92% >= 85%

    const genealogyRes = await request(app)
      .get(`/api/v1/production/seed-lots/${child.id}/genealogy`)
      .set('Authorization', `Bearer ${token}`);

    expect(genealogyRes.status).toBe(200);
    const data = genealogyRes.body.data;

    expect(data.ancestorPath.map((lot: { id: string }) => lot.id)).toEqual([parent.id, child.id]);
    expect(data.nodes.some((lot: { id: string }) => lot.id === parent.id)).toBe(true);
    expect(data.nodes.some((lot: { id: string; testing_status: string }) => lot.id === child.id && lot.testing_status === 'certified')).toBe(
      true,
    );

    const childSubmissions = data.testSubmissionsByLot[child.id];
    expect(childSubmissions).toHaveLength(1);
    expect(childSubmissions[0].results[0]).toMatchObject({ test_type: 'germination', passed: true });
    expect(data.testSubmissionsByLot[parent.id]).toBeUndefined();
  });
});
