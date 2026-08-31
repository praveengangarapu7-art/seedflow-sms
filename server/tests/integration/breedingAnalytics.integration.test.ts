import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestOrganization, createTestSeedLot, createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('breeding analytics API', () => {
  it('records numeric and categorical trait measurements, enforces exactly-one-of, and blocks a non-Breeder/Admin role', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const lot = await createTestSeedLot({ organizationId: breeder.organizationId! });

    const numericRes = await request(app)
      .post('/api/v1/production/breeding-analytics/traits')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: lot.id, traitType: 'yield_per_acre', numericValue: 42.5, unit: 'kg', measuredDate: '2026-01-01' });
    expect(numericRes.status).toBe(201);

    const categoryRes = await request(app)
      .post('/api/v1/production/breeding-analytics/traits')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: lot.id, traitType: 'disease_resistance', categoryValue: 'high', measuredDate: '2026-01-01' });
    expect(categoryRes.status).toBe(201);

    const bothRes = await request(app)
      .post('/api/v1/production/breeding-analytics/traits')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: lot.id, traitType: 'x', numericValue: 1, categoryValue: 'y', measuredDate: '2026-01-01' });
    expect(bothRes.status).toBe(400);

    const neitherRes = await request(app)
      .post('/api/v1/production/breeding-analytics/traits')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: lot.id, traitType: 'x', measuredDate: '2026-01-01' });
    expect(neitherRes.status).toBe(400);

    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const forbidden = await request(app)
      .post('/api/v1/production/breeding-analytics/traits')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ seedLotId: lot.id, traitType: 'yield_per_acre', numericValue: 1, measuredDate: '2026-01-01' });
    expect(forbidden.status).toBe(403);

    const listRes = await request(app).get(`/api/v1/production/breeding-analytics/seed-lots/${lot.id}/traits`).set('Authorization', `Bearer ${breederToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(2);
  });

  it('summarizes lineage, ranks germplasm, computes cycle timelines, and computes yield-multiplication ROI across a real breeder->foundation->certified chain', async () => {
    const org = await createTestOrganization();
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const crop = `Crop-${uniqueSuffix()}`;

    const root = await createTestSeedLot({ organizationId: org.id, crop, stage: 'Breeder', quantityTotal: 10, productionDate: '2025-01-01' });
    const foundation = await createTestSeedLot({
      organizationId: org.id,
      crop,
      stage: 'Foundation',
      parentLotId: root.id,
      quantityTotal: 100,
      productionDate: '2025-04-01', // 90 days after root
    });
    const certified = await createTestSeedLot({
      organizationId: org.id,
      crop,
      stage: 'Certified',
      parentLotId: foundation.id,
      quantityTotal: 1000,
      productionDate: '2025-09-01', // 243 days after root
    });

    // Give the certified descendant a passing germination result so the germplasm ranking has a real quality signal.
    await request(app).post('/api/v1/production/compliance/phytosanitary-certificates').set('Authorization', `Bearer ${inspectorToken}`)
      .send({ seedLotId: certified.id, certificateNumber: `PHYTO-${uniqueSuffix()}`, issuingAuthority: 'Board', issueDate: '2025-09-01' });
    await request(app).post('/api/v1/production/analytics/germination-tests').set('Authorization', `Bearer ${inspectorToken}`)
      .send({ seedLotId: certified.id, sampleSize: 100, germinatedCount: 88 });

    const lineageRes = await request(app)
      .get(`/api/v1/production/breeding-analytics/lineage-summary?rootLotIds=${root.id}`)
      .set('Authorization', `Bearer ${inspectorToken}`);
    expect(lineageRes.status).toBe(200);
    const lineage = lineageRes.body.data.find((l: { rootLotId: string }) => l.rootLotId === root.id);
    expect(lineage.descendantCount).toBe(2);
    expect(lineage.foundationLotCount).toBe(1);
    expect(lineage.certifiedLotCount).toBe(1);
    expect(lineage.totalDescendantQuantity).toBe(1100);

    const germplasmRes = await request(app).get('/api/v1/production/breeding-analytics/germplasm-rankings').set('Authorization', `Bearer ${inspectorToken}`);
    expect(germplasmRes.status).toBe(200);
    const ranking = germplasmRes.body.data.find((r: { rootLotId: string }) => r.rootLotId === root.id);
    expect(ranking).toBeTruthy();
    expect(ranking.score).toBeGreaterThan(0);
    expect(ranking.breakdown.some((b: { signal: string }) => b.signal === 'germination')).toBe(true);

    const timelineRes = await request(app)
      .get(`/api/v1/production/breeding-analytics/cycle-timelines?rootLotIds=${root.id}`)
      .set('Authorization', `Bearer ${inspectorToken}`);
    expect(timelineRes.status).toBe(200);
    const foundationEntry = timelineRes.body.data.find((e: { descendantLotId: string }) => e.descendantLotId === foundation.id);
    const certifiedEntry = timelineRes.body.data.find((e: { descendantLotId: string }) => e.descendantLotId === certified.id);
    expect(foundationEntry.daysFromRoot).toBe(90);
    expect(certifiedEntry.daysFromRoot).toBe(243);

    const roiRes = await request(app)
      .get(`/api/v1/production/breeding-analytics/program-roi?rootLotIds=${root.id}`)
      .set('Authorization', `Bearer ${inspectorToken}`);
    expect(roiRes.status).toBe(200);
    const roi = roiRes.body.data.find((r: { rootLotId: string }) => r.rootLotId === root.id);
    expect(roi.breederStageQuantity).toBe(10);
    expect(roi.foundationYieldAchieved).toBe(100);
    expect(roi.yieldMultiplicationRoi).toBe(10); // 100 / 10
  });

  it('analyzes trait inheritance with a real Pearson correlation between parent and child measurements', async () => {
    const org = await createTestOrganization();
    const breeder = await createTestUser({ role: 'Breeder', organizationId: org.id });
    const breederToken = await loginAs(breeder);
    const traitType = `yield_${uniqueSuffix()}`;

    // A perfectly linear parent->child relationship: child = 2x parent.
    const pairs = [
      { parent: 10, child: 20 },
      { parent: 20, child: 40 },
      { parent: 30, child: 60 },
    ];
    for (const { parent, child } of pairs) {
      const parentLot = await createTestSeedLot({ organizationId: org.id, stage: 'Foundation', productionDate: '2025-01-01' });
      const childLot = await createTestSeedLot({ organizationId: org.id, stage: 'Certified', parentLotId: parentLot.id, productionDate: '2025-06-01' });
      await request(app).post('/api/v1/production/breeding-analytics/traits').set('Authorization', `Bearer ${breederToken}`)
        .send({ seedLotId: parentLot.id, traitType, numericValue: parent, measuredDate: '2026-01-01' });
      await request(app).post('/api/v1/production/breeding-analytics/traits').set('Authorization', `Bearer ${breederToken}`)
        .send({ seedLotId: childLot.id, traitType, numericValue: child, measuredDate: '2026-01-01' });
    }

    const res = await request(app)
      .get(`/api/v1/production/breeding-analytics/trait-inheritance?traitType=${traitType}`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.correlation).toBe(1);
    expect(res.body.data.sampleSize).toBe(3);
    expect(res.body.data.strength).toBe('strong');
  });

  it('predicts hybrid vigor for a cross, blends in a real historical outcome on the next prediction, and blocks a duplicate actual-outcome recording', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const traitType = `vigorTrait_${uniqueSuffix()}`;

    const parentA1 = await createTestSeedLot({ stage: 'Breeder' });
    const parentB1 = await createTestSeedLot({ stage: 'Breeder' }); // different lineage (different org/root by default)
    await request(app).post('/api/v1/production/breeding-analytics/traits').set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: parentA1.id, traitType, numericValue: 100, measuredDate: '2026-01-01' });
    await request(app).post('/api/v1/production/breeding-analytics/traits').set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: parentB1.id, traitType, numericValue: 100, measuredDate: '2026-01-01' });

    const predictRes = await request(app)
      .post('/api/v1/production/breeding-analytics/hybrid-predictions')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ parentALotId: parentA1.id, parentBLotId: parentB1.id, traitType });
    expect(predictRes.status).toBe(201);
    expect(predictRes.body.data.same_lineage).toBe(false);
    expect(Number(predictRes.body.data.predicted_heterosis_percent)).toBe(10); // no history yet -> pure heuristic
    expect(Number(predictRes.body.data.predicted_vigor_score)).toBe(110);

    // Record a big realized heterosis for this prediction (actual came in way above predicted).
    const childLot = await createTestSeedLot({ stage: 'Certified' });
    const outcomeRes = await request(app)
      .post(`/api/v1/production/breeding-analytics/hybrid-predictions/${predictRes.body.data.id}/actual-outcome`)
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ actualChildLotId: childLot.id, actualTraitValue: 140 }); // realized heterosis = (140-100)/100*100 = 40%
    expect(outcomeRes.status).toBe(200);

    const duplicateOutcomeRes = await request(app)
      .post(`/api/v1/production/breeding-analytics/hybrid-predictions/${predictRes.body.data.id}/actual-outcome`)
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ actualChildLotId: childLot.id, actualTraitValue: 150 });
    expect(duplicateOutcomeRes.status).toBe(409);

    // A second, different-lineage cross for the same trait should now blend in that 40% realized outcome.
    const parentA2 = await createTestSeedLot({ stage: 'Breeder' });
    const parentB2 = await createTestSeedLot({ stage: 'Breeder' });
    await request(app).post('/api/v1/production/breeding-analytics/traits').set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: parentA2.id, traitType, numericValue: 100, measuredDate: '2026-01-01' });
    await request(app).post('/api/v1/production/breeding-analytics/traits').set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: parentB2.id, traitType, numericValue: 100, measuredDate: '2026-01-01' });

    const secondPredictRes = await request(app)
      .post('/api/v1/production/breeding-analytics/hybrid-predictions')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ parentALotId: parentA2.id, parentBLotId: parentB2.id, traitType });
    expect(secondPredictRes.status).toBe(201);
    // (10*1 + 40*2)/3 = 30
    expect(Number(secondPredictRes.body.data.predicted_heterosis_percent)).toBe(30);

    // Predicting without a recorded trait measurement is rejected outright.
    const untestedLot = await createTestSeedLot({ stage: 'Breeder' });
    const missingTraitRes = await request(app)
      .post('/api/v1/production/breeding-analytics/hybrid-predictions')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ parentALotId: untestedLot.id, parentBLotId: parentB2.id, traitType });
    expect(missingTraitRes.status).toBe(409);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/production/breeding-analytics/germplasm-rankings');
    expect(res.status).toBe(401);
  });
});
