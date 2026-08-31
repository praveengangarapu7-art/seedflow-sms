import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestFarmer, createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

async function recordPhytoCert(token: string, seedLotId: string) {
  return request(app)
    .post('/api/v1/production/compliance/phytosanitary-certificates')
    .set('Authorization', `Bearer ${token}`)
    .send({ seedLotId, certificateNumber: `PHYTO-${Math.random().toString(36).slice(2, 10)}`, issuingAuthority: 'State Plant Board', issueDate: '2026-01-01' });
}

async function recordGermination(token: string, seedLotId: string, sampleSize: number, germinatedCount: number) {
  return request(app)
    .post('/api/v1/production/analytics/germination-tests')
    .set('Authorization', `Bearer ${token}`)
    .send({ seedLotId, sampleSize, germinatedCount });
}

describe('government programs API', () => {
  it('auto-approves a registration for a Certified lot with a valid phyto certificate and passing germination', async () => {
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const authority = await createTestOrganization({ type: 'government_authority' });
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId!, stage: 'Certified' });

    await recordPhytoCert(inspectorToken, lot.id);
    await recordGermination(inspectorToken, lot.id, 100, 90);

    const res = await request(app)
      .post(`/api/v1/government-programs/seed-lots/${lot.id}/registrations`)
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ authorityOrgId: authority.id });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.registration_number).toMatch(/^GOV-REG-/);
  });

  it('leaves a registration under_review when auto-approval criteria are not met, then lets Inspector decide manually', async () => {
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const authority = await createTestOrganization({ type: 'government_authority' });
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId!, stage: 'Foundation' }); // not Certified

    const submitRes = await request(app)
      .post(`/api/v1/government-programs/seed-lots/${lot.id}/registrations`)
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ authorityOrgId: authority.id });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('under_review');
    const registrationId = submitRes.body.data.id;

    // Breeder (not a decision-authority role) cannot decide it themselves.
    const wrongDecider = await request(app)
      .post(`/api/v1/government-programs/registrations/${registrationId}/approve`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(wrongDecider.status).toBe(403);

    const approveRes = await request(app)
      .post(`/api/v1/government-programs/registrations/${registrationId}/approve`)
      .set('Authorization', `Bearer ${inspectorToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
    expect(approveRes.body.data.registration_number).toMatch(/^GOV-REG-/);
  });

  it('rejects a registration with a required reason', async () => {
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const authority = await createTestOrganization({ type: 'government_authority' });
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId!, stage: 'Foundation' });

    const submitRes = await request(app)
      .post(`/api/v1/government-programs/seed-lots/${lot.id}/registrations`)
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ authorityOrgId: authority.id });
    const registrationId = submitRes.body.data.id;

    const noReasonRes = await request(app)
      .post(`/api/v1/government-programs/registrations/${registrationId}/reject`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({});
    expect(noReasonRes.status).toBe(400);

    const rejectRes = await request(app)
      .post(`/api/v1/government-programs/registrations/${registrationId}/reject`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ reason: 'Missing supporting documentation' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('rejected');
    expect(rejectRes.body.data.rejection_reason).toBe('Missing supporting documentation');
  });

  it('runs the full subsidy claim lifecycle: submit -> approve -> pay, with claim_amount snapshotted from the program rate', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const authority = await createTestOrganization({ type: 'government_authority' });
    const lot = await createTestSeedLot({ crop: 'Paddy', stage: 'Certified' });
    const farmer = await createTestFarmer({ region: 'North Valley' });

    const programRes = await request(app)
      .post('/api/v1/government-programs/subsidy-programs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Paddy Certified Seed Subsidy', authorityOrgId: authority.id, crop: 'Paddy', minStage: 'Certified', subsidyAmountPerUnit: 5 });
    expect(programRes.status).toBe(201);
    const programId = programRes.body.data.id;

    const claimRes = await request(app)
      .post('/api/v1/government-programs/subsidy-claims')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ programId, farmerId: farmer.id, seedLotId: lot.id, quantity: 20 });
    expect(claimRes.status).toBe(201);
    expect(claimRes.body.data.status).toBe('submitted');
    expect(Number(claimRes.body.data.claim_amount)).toBe(100); // 20 * 5
    const claimId = claimRes.body.data.id;

    // Producer (not a decision-authority role) cannot approve their own claim.
    const wrongApprove = await request(app)
      .post(`/api/v1/government-programs/subsidy-claims/${claimId}/approve`)
      .set('Authorization', `Bearer ${producerToken}`);
    expect(wrongApprove.status).toBe(403);

    const approveRes = await request(app)
      .post(`/api/v1/government-programs/subsidy-claims/${claimId}/approve`)
      .set('Authorization', `Bearer ${inspectorToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');

    // Inspector cannot disburse funds — payment is Admin-only.
    const wrongPay = await request(app)
      .post(`/api/v1/government-programs/subsidy-claims/${claimId}/pay`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ paymentReference: 'TXN-001' });
    expect(wrongPay.status).toBe(403);

    const payRes = await request(app)
      .post(`/api/v1/government-programs/subsidy-claims/${claimId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentReference: 'TXN-001' });
    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('paid');
    expect(payRes.body.data.payment_reference).toBe('TXN-001');
  });

  it('rejects an ineligible claim at submission time with specific reasons, and enforces the per-farmer quantity cap across claims', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const authority = await createTestOrganization({ type: 'government_authority' });
    const farmer = await createTestFarmer({ region: 'North Valley' });

    const programRes = await request(app)
      .post('/api/v1/government-programs/subsidy-programs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Capped Wheat Subsidy',
        authorityOrgId: authority.id,
        crop: 'Wheat',
        minStage: 'Certified',
        subsidyAmountPerUnit: 2,
        eligibilityCriteria: { maxQuantityPerFarmer: 15 },
      });
    const programId = programRes.body.data.id;

    const wrongCropLot = await createTestSeedLot({ crop: 'Paddy', stage: 'Certified' });
    const ineligibleRes = await request(app)
      .post('/api/v1/government-programs/subsidy-claims')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ programId, farmerId: farmer.id, seedLotId: wrongCropLot.id, quantity: 5 });
    expect(ineligibleRes.status).toBe(400);
    expect(ineligibleRes.body.message).toMatch(/only covers Wheat/);

    const wheatLot = await createTestSeedLot({ crop: 'Wheat', stage: 'Certified' });
    const firstClaim = await request(app)
      .post('/api/v1/government-programs/subsidy-claims')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ programId, farmerId: farmer.id, seedLotId: wheatLot.id, quantity: 10 });
    expect(firstClaim.status).toBe(201);

    const secondClaim = await request(app)
      .post('/api/v1/government-programs/subsidy-claims')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ programId, farmerId: farmer.id, seedLotId: wheatLot.id, quantity: 10 });
    expect(secondClaim.status).toBe(400);
    expect(secondClaim.body.message).toMatch(/exceeds the per-farmer limit/);
  });

  it('generates production, distribution, and quality reports', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    await createTestSeedLot({ crop: 'Sorghum', variety: 'SorghumX', stage: 'Certified', quantityTotal: 200 });

    for (const reportType of ['production', 'distribution', 'quality']) {
      const genRes = await request(app)
        .post(`/api/v1/government-programs/reports/${reportType}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(genRes.status).toBe(201);
      expect(genRes.body.data.report_type).toBe(reportType);
      expect(Array.isArray(genRes.body.data.snapshot)).toBe(true);
    }

    const listRes = await request(app).get('/api/v1/government-programs/reports?reportType=production').set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);

    const badTypeRes = await request(app)
      .post('/api/v1/government-programs/reports/not-a-real-type')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(badTypeRes.status).toBe(400);
  });

  it('rejects an unauthenticated request and blocks a non-Admin from creating a subsidy program', async () => {
    const noAuthRes = await request(app).get('/api/v1/government-programs/subsidy-programs');
    expect(noAuthRes.status).toBe(401);

    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const authority = await createTestOrganization({ type: 'government_authority' });
    const forbiddenRes = await request(app)
      .post('/api/v1/government-programs/subsidy-programs')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ name: 'Should Not Work', authorityOrgId: authority.id, subsidyAmountPerUnit: 1 });
    expect(forbiddenRes.status).toBe(403);
  });
});
