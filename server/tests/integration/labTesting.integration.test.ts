import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('lab testing API', () => {
  it('submits a sample batch, records a failing result, and auto-raises a quality flag', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);
    const lab = await createTestOrganization({ type: 'laboratory' });
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId!, stage: 'Certified' });

    const submitRes = await request(app)
      .post('/api/v1/production/lab-testing/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: lot.id, labOrganizationId: lab.id, requestedTests: ['germination'], sampleQuantity: 50 });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('submitted');
    const submissionId = submitRes.body.data.id;

    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const resultRes = await request(app)
      .post(`/api/v1/production/lab-testing/submissions/${submissionId}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testType: 'germination', metrics: { sampleSize: 100, germinatedCount: 60 } }); // 60% < 85% threshold

    expect(resultRes.status).toBe(201);
    expect(resultRes.body.data.status).toBe('failed');
    expect(resultRes.body.data.results[0].passed).toBe(false);

    const flagsRes = await request(app)
      .get(`/api/v1/production/lab-testing/quality-flags?seedLotId=${lot.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(flagsRes.status).toBe(200);
    expect(flagsRes.body.data.some((f: { submission_id: string }) => f.submission_id === submissionId)).toBe(true);
  });

  it('rejects submitting to a non-laboratory organization', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);
    const notALab = await createTestOrganization({ type: 'producer' });
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId! });

    const res = await request(app)
      .post('/api/v1/production/lab-testing/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: lot.id, labOrganizationId: notALab.id, requestedTests: ['purity'], sampleQuantity: 10 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not a testing laboratory/i);
  });

  it('moves the seed lot to testing on submission and to certified once every requested test passes', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);
    const lab = await createTestOrganization({ type: 'laboratory' });
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId!, stage: 'Certified' });

    const beforeSubmit = await pool.query('SELECT testing_status FROM seed_lots WHERE id = $1', [lot.id]);
    expect(beforeSubmit.rows[0].testing_status).toBe('not_submitted');

    const submitRes = await request(app)
      .post('/api/v1/production/lab-testing/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: lot.id, labOrganizationId: lab.id, requestedTests: ['germination', 'purity'], sampleQuantity: 50 });
    expect(submitRes.status).toBe(201);
    const submissionId = submitRes.body.data.id;

    const afterSubmit = await pool.query('SELECT testing_status FROM seed_lots WHERE id = $1', [lot.id]);
    expect(afterSubmit.rows[0].testing_status).toBe('testing');

    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);

    // Only germination recorded so far — still testing, not yet finalized.
    await request(app)
      .post(`/api/v1/production/lab-testing/submissions/${submissionId}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testType: 'germination', metrics: { sampleSize: 100, germinatedCount: 90 } }); // 90% >= 85%

    const midway = await pool.query('SELECT testing_status FROM seed_lots WHERE id = $1', [lot.id]);
    expect(midway.rows[0].testing_status).toBe('testing');

    // Second and final requested test also passes -> lot is certified.
    const finalResultRes = await request(app)
      .post(`/api/v1/production/lab-testing/submissions/${submissionId}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testType: 'purity', metrics: { sampleWeight: 100, pureSeedWeight: 99 } }); // 99% >= 98%
    expect(finalResultRes.body.data.status).toBe('completed');

    const afterCertified = await pool.query('SELECT testing_status FROM seed_lots WHERE id = $1', [lot.id]);
    expect(afterCertified.rows[0].testing_status).toBe('certified');
  });

  it('moves the seed lot to rejected once a requested test fails', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const token = await loginAs(breeder);
    const lab = await createTestOrganization({ type: 'laboratory' });
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId!, stage: 'Certified' });

    const submitRes = await request(app)
      .post('/api/v1/production/lab-testing/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: lot.id, labOrganizationId: lab.id, requestedTests: ['germination'], sampleQuantity: 50 });
    const submissionId = submitRes.body.data.id;

    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    await request(app)
      .post(`/api/v1/production/lab-testing/submissions/${submissionId}/results`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testType: 'germination', metrics: { sampleSize: 100, germinatedCount: 40 } }); // 40% < 85%

    const afterRejected = await pool.query('SELECT testing_status FROM seed_lots WHERE id = $1', [lot.id]);
    expect(afterRejected.rows[0].testing_status).toBe('rejected');
  });
});


describe('laboratory certificates listing (Laboratory module)', () => {
  it('lists only certificates issued from a lab submission, with lot code and lab name joined on', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lab = await createTestOrganization({ type: 'laboratory' });
    const lot = await createTestSeedLot({ stage: 'Certified' });

    const submitRes = await request(app)
      .post('/api/v1/production/lab-testing/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: lot.id, labOrganizationId: lab.id, requestedTests: ['germination'], sampleQuantity: 60 });
    const submissionId = submitRes.body.data.id;

    await request(app)
      .post(`/api/v1/production/lab-testing/submissions/${submissionId}/results`)
      .set('Authorization', `Bearer ${token}`)
      .send({ testType: 'germination', metrics: { sampleSize: 200, germinatedCount: 190 } }); // 95% passes

    const certRes = await request(app)
      .post(`/api/v1/production/lab-testing/submissions/${submissionId}/phytosanitary-certificate`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(certRes.status).toBe(201);

    const listRes = await request(app)
      .get('/api/v1/production/lab-testing/certificates')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);

    const entry = listRes.body.data.find((c: { submission_id: string }) => c.submission_id === submissionId);
    expect(entry).toBeTruthy();
    expect(entry.lot_code).toBe(lot.lot_code);
    expect(entry.lab_organization_name).toBe(lab.name);
    expect(entry.certificate_number).toBe(certRes.body.data.certificate_number);
  });

  it('excludes certificates written directly by the compliance module (no originating submission)', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const lot = await createTestSeedLot({ stage: 'Certified' });

    const directRes = await request(app)
      .post('/api/v1/production/compliance/phytosanitary-certificates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        seedLotId: lot.id,
        certificateNumber: `DIRECT-${lot.lot_code}`,
        issuingAuthority: 'National Plant Protection Organization',
        issueDate: new Date().toISOString().slice(0, 10),
      });
    expect(directRes.status).toBe(201);

    const listRes = await request(app)
      .get('/api/v1/production/lab-testing/certificates')
      .set('Authorization', `Bearer ${token}`);
    const numbers = listRes.body.data.map((c: { certificate_number: string }) => c.certificate_number);
    expect(numbers).not.toContain(`DIRECT-${lot.lot_code}`);
  });
});
