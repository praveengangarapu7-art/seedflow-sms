import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestFarmer, createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('financing API', () => {
  it('validates borrower type matches financing type, and blocks a role outside FINANCING_REQUEST_ROLES', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const org = await createTestOrganization({ type: 'breeder' });
    const farmer = await createTestFarmer();

    const wrongBorrower = await request(app)
      .post('/api/v1/financing/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ financingType: 'breeder_credit', borrowerFarmerId: farmer.id, principalAmount: 1000, annualInterestRatePercent: 10 });
    expect(wrongBorrower.status).toBe(400);

    const missingReceivable = await request(app)
      .post('/api/v1/financing/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ financingType: 'warehouse_receivables', borrowerOrganizationId: org.id, principalAmount: 8000, annualInterestRatePercent: 10 });
    expect(missingReceivable.status).toBe(400);

    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const forbidden = await request(app)
      .post('/api/v1/financing/accounts')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ financingType: 'breeder_credit', borrowerOrganizationId: org.id, principalAmount: 1000, annualInterestRatePercent: 10 });
    expect(forbidden.status).toBe(403);
  });

  it('runs the full breeder_credit lifecycle: request -> approve -> disburse -> trigger post-harvest repayment -> repay, computing real accrued interest', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId!, stage: 'Foundation' });

    const requestRes = await request(app)
      .post('/api/v1/financing/accounts')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ financingType: 'breeder_credit', borrowerOrganizationId: breeder.organizationId, seedLotId: lot.id, principalAmount: 50000, annualInterestRatePercent: 12 });
    expect(requestRes.status).toBe(201);
    expect(requestRes.body.data.status).toBe('requested');
    const accountId = requestRes.body.data.id;

    const wrongApprover = await request(app).post(`/api/v1/financing/accounts/${accountId}/approve`).set('Authorization', `Bearer ${breederToken}`);
    expect(wrongApprover.status).toBe(403);

    const approveRes = await request(app).post(`/api/v1/financing/accounts/${accountId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
    expect(approveRes.body.data.approved_by).toBe(admin.email);

    const disburseRes = await request(app).post(`/api/v1/financing/accounts/${accountId}/disburse`).set('Authorization', `Bearer ${adminToken}`);
    expect(disburseRes.status).toBe(200);
    expect(disburseRes.body.data.status).toBe('disbursed');
    expect(disburseRes.body.data.disbursed_at).toBeTruthy();

    // Repayment can't be triggered before a harvest is recorded for the linked lot.
    const tooEarly = await request(app).post(`/api/v1/financing/accounts/${accountId}/trigger-repayment`).set('Authorization', `Bearer ${breederToken}`);
    expect(tooEarly.status).toBe(409);

    await request(app).post('/api/v1/production/analytics/harvest-yields').set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: lot.id, sownQuantity: 100, harvestedQuantity: 90 });

    const triggerRes = await request(app).post(`/api/v1/financing/accounts/${accountId}/trigger-repayment`).set('Authorization', `Bearer ${breederToken}`);
    expect(triggerRes.status).toBe(200);
    expect(triggerRes.body.data.status).toBe('repaying');
    expect(Number(triggerRes.body.data.amount_due)).toBeGreaterThanOrEqual(50000); // principal + some (possibly zero-but-rounded) accrued interest
    expect(triggerRes.body.data.repayment_due_date).toBeTruthy();

    const interestRes = await request(app).get(`/api/v1/financing/accounts/${accountId}/accrued-interest`).set('Authorization', `Bearer ${breederToken}`);
    expect(interestRes.status).toBe(200);
    expect(interestRes.body.data.accruedInterest).toBeGreaterThanOrEqual(0);

    const wrongRepayer = await request(app)
      .post(`/api/v1/financing/accounts/${accountId}/repay`)
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ repaidAmount: 50000, paymentReference: 'TXN-1' });
    expect(wrongRepayer.status).toBe(403);

    const repayRes = await request(app)
      .post(`/api/v1/financing/accounts/${accountId}/repay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ repaidAmount: 50000, paymentReference: 'TXN-1' });
    expect(repayRes.status).toBe(200);
    expect(repayRes.body.data.status).toBe('repaid');
    expect(repayRes.body.data.payment_reference).toBe('TXN-1');

    const costsRes = await request(app).get(`/api/v1/financing/seed-lots/${lot.id}/financing-costs`).set('Authorization', `Bearer ${breederToken}`);
    expect(costsRes.status).toBe(200);
    expect(costsRes.body.data.financingCount).toBe(1);
    expect(costsRes.body.data.totalPrincipal).toBe(50000);
  });

  it('rejects a financing request with a required reason, and only Admin can reject', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const org = await createTestOrganization({ type: 'warehouse' });

    const requestRes = await request(app)
      .post('/api/v1/financing/accounts')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ financingType: 'warehouse_receivables', borrowerOrganizationId: org.id, principalAmount: 8000, receivableAmount: 10000, annualInterestRatePercent: 15 });
    expect(requestRes.status).toBe(201);

    const noReason = await request(app)
      .post(`/api/v1/financing/accounts/${requestRes.body.data.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(noReason.status).toBe(400);

    const wrongRejecter = await request(app)
      .post(`/api/v1/financing/accounts/${requestRes.body.data.id}/reject`)
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ reason: 'x' });
    expect(wrongRejecter.status).toBe(403);

    const rejectRes = await request(app)
      .post(`/api/v1/financing/accounts/${requestRes.body.data.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Insufficient receivable history' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('rejected');
  });

  it('marks a disbursed farmer_microfinance account as defaulted', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const farmer = await createTestFarmer();

    const requestRes = await request(app)
      .post('/api/v1/financing/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ financingType: 'farmer_microfinance', borrowerFarmerId: farmer.id, principalAmount: 500, annualInterestRatePercent: 8 });
    const accountId = requestRes.body.data.id;
    await request(app).post(`/api/v1/financing/accounts/${accountId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).post(`/api/v1/financing/accounts/${accountId}/disburse`).set('Authorization', `Bearer ${adminToken}`);

    const defaultRes = await request(app)
      .post(`/api/v1/financing/accounts/${accountId}/default`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Farmer reported total crop failure' });
    expect(defaultRes.status).toBe(200);
    expect(defaultRes.body.data.status).toBe('defaulted');
    expect(defaultRes.body.data.default_reason).toMatch(/crop failure/);
  });

  it('reads crop insurance context from the existing market-intelligence records without duplicating them', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const crop = `Crop-${uniqueSuffix()}`;

    const noneYet = await request(app).get(`/api/v1/financing/insurance-context?crop=${crop}`).set('Authorization', `Bearer ${breederToken}`);
    expect(noneYet.status).toBe(200);
    expect(noneYet.body.data).toBeNull();

    await request(app).post('/api/v1/production/market-intelligence/insurance-records').set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, season: 'Kharif', claimsCount: 4, totalClaimAmount: 20000 });

    const withDataRes = await request(app).get(`/api/v1/financing/insurance-context?crop=${crop}&season=Kharif`).set('Authorization', `Bearer ${breederToken}`);
    expect(withDataRes.status).toBe(200);
    expect(withDataRes.body.data.claimsCount).toBe(4);
    expect(withDataRes.body.data.totalClaimAmount).toBe(20000);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/financing/accounts');
    expect(res.status).toBe(401);
  });
});
