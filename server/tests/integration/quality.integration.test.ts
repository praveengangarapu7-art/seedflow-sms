import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestSeedLot, createTestUser, type TestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

const API = '/api/v1/quality';

interface Actor {
  user: TestUser;
  token: string;
}

async function actor(role: 'Admin' | 'Inspector' | 'Breeder' | 'Producer' | 'Warehouse Manager'): Promise<Actor> {
  const user = await createTestUser({ role });
  return { user, token: await loginAs(user) };
}

const as = (a: Actor) => ({
  get: (path: string) => request(app).get(`${API}${path}`).set('Authorization', `Bearer ${a.token}`),
  post: (path: string, body: object = {}) => request(app).post(`${API}${path}`).set('Authorization', `Bearer ${a.token}`).send(body),
  patch: (path: string, body: object = {}) => request(app).patch(`${API}${path}`).set('Authorization', `Bearer ${a.token}`).send(body),
});

function inDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const NCR_BODY = {
  title: 'Moisture above limit at bagging',
  description: 'Lot bagged at 13.4% moisture against a 12% limit',
  department: 'production',
  source: 'inspection',
  severity: 'major',
};

async function createSop(a: Actor, overrides: Record<string, unknown> = {}) {
  const res = await as(a).post('/sops', {
    title: 'Incoming seed lot inspection',
    department: 'procurement',
    ownerEmail: 'owner@example.com',
    content: '1. Verify tags\n2. Sample per plan\n3. Record',
    ...overrides,
  });
  expect(res.status).toBe(201);
  return res.body.data as { document: { id: string; sop_code: string }; version: { id: string; version_number: number } };
}

/** Raises a major NCR, gives it a CAPA, drives that CAPA to closed. Returns ids. */
async function ncrWithClosedCapa(staff: Actor, verifierAdmin: Actor, overrides: Record<string, unknown> = {}) {
  const ncrRes = await as(staff).post('/ncrs', { ...NCR_BODY, ...overrides });
  expect(ncrRes.status).toBe(201);
  const ncrId = ncrRes.body.data.ncr.id as string;
  const capaRes = await as(staff).post('/capas', {
    ncrId,
    actionType: 'corrective',
    title: 'Recalibrate moisture meter',
    description: 'Recalibrate and add a second reading',
    ownerEmail: staff.user.email,
    dueDate: inDays(10),
  });
  expect(capaRes.status).toBe(201);
  const capaId = capaRes.body.data.id as string;
  expect((await as(staff).post(`/capas/${capaId}/implement`, { implementationNotes: 'Meter recalibrated' })).status).toBe(200);
  expect(
    (await as(verifierAdmin).post(`/capas/${capaId}/verify`, { result: 'effective', effectivenessNotes: 'No recurrence in 10 lots' })).status,
  ).toBe(200);
  return { ncrId, capaId };
}

describe('quality: SOP register', () => {
  it('creates a draft, enforces author != approver, and makes the approved version effective with a review date', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const sop = await createSop(inspector);
    expect(sop.document.sop_code).toMatch(/^SOP-PRC-\d{3}$/);
    expect(sop.version.version_number).toBe(1);

    expect((await as(inspector).post(`/sops/${sop.document.id}/submit`)).status).toBe(200);

    // Inspector authored it and is not an Admin, so the role gate stops them first.
    expect((await as(inspector).post(`/sops/${sop.document.id}/approve`)).status).toBe(403);

    // An Admin who authored a SOP still cannot approve it.
    const adminAuthored = await createSop(admin, { title: 'Admin-authored SOP', department: 'logistics' });
    await as(admin).post(`/sops/${adminAuthored.document.id}/submit`);
    const selfApprove = await as(admin).post(`/sops/${adminAuthored.document.id}/approve`);
    expect(selfApprove.status).toBe(403);
    expect(selfApprove.body.message).toMatch(/author/i);

    const approve = await as(admin).post(`/sops/${sop.document.id}/approve`);
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe('effective');
    expect(approve.body.data.approved_by).toBe(admin.user.email);
    expect(approve.body.data.effective_date).toBeTruthy();
    expect(approve.body.data.next_review_date).toBeTruthy();
  });

  it('keeps the old version in force during a revision, then supersedes it on approval', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const sop = await createSop(inspector, { department: 'laboratory' });
    await as(inspector).post(`/sops/${sop.document.id}/submit`);
    await as(admin).post(`/sops/${sop.document.id}/approve`);

    const revise = await as(inspector).post(`/sops/${sop.document.id}/revise`, {
      content: '1. Verify tags\n2. Sample per plan\n3. Photograph\n4. Record',
      changeSummary: 'Added photo step',
    });
    expect(revise.status).toBe(201);
    expect(revise.body.data.version_number).toBe(2);

    // A second concurrent revision is refused.
    const again = await as(inspector).post(`/sops/${sop.document.id}/revise`, { content: 'x', changeSummary: 'y' });
    expect(again.status).toBe(409);

    let detail = await as(admin).get(`/sops/${sop.document.id}`);
    expect(detail.body.data.versions.find((v: { status: string }) => v.status === 'effective').version_number).toBe(1);

    await as(inspector).post(`/sops/${sop.document.id}/submit`);
    expect((await as(admin).post(`/sops/${sop.document.id}/approve`)).status).toBe(200);

    detail = await as(admin).get(`/sops/${sop.document.id}`);
    const byStatus = (s: string) => detail.body.data.versions.filter((v: { status: string }) => v.status === s);
    expect(byStatus('effective')).toHaveLength(1);
    expect(byStatus('effective')[0].version_number).toBe(2);
    expect(byStatus('superseded')[0].version_number).toBe(1);
  });

  it('records a rejection reason and lets the author revise again', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const sop = await createSop(inspector, { department: 'warehouse' });
    await as(inspector).post(`/sops/${sop.document.id}/submit`);

    const noReason = await as(admin).post(`/sops/${sop.document.id}/reject`, {});
    expect(noReason.status).toBe(400);

    const rejected = await as(admin).post(`/sops/${sop.document.id}/reject`, { reason: 'Missing FEFO rule' });
    expect(rejected.body.data.status).toBe('rejected');
    expect(rejected.body.data.rejection_reason).toBe('Missing FEFO rule');

    const revise = await as(inspector).post(`/sops/${sop.document.id}/revise`, { content: 'with FEFO', changeSummary: 'Added FEFO' });
    expect(revise.status).toBe(201);
    expect(revise.body.data.version_number).toBe(2);
  });

  it('tracks acknowledgements per person, idempotently, and lists what is still pending', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const worker = await actor('Warehouse Manager');
    const sop = await createSop(inspector, { department: 'hr_training' });

    // Nothing to acknowledge until a version is effective.
    expect((await as(worker).post(`/sops/${sop.document.id}/acknowledge`)).status).toBe(409);

    await as(inspector).post(`/sops/${sop.document.id}/submit`);
    await as(admin).post(`/sops/${sop.document.id}/approve`);

    const pendingBefore = await as(worker).get('/sops/pending-acknowledgement');
    expect(pendingBefore.body.data.some((s: { id: string }) => s.id === sop.document.id)).toBe(true);

    const first = await as(worker).post(`/sops/${sop.document.id}/acknowledge`);
    expect(first.status).toBe(200);
    expect(first.body.data.alreadyAcknowledged).toBe(false);
    const second = await as(worker).post(`/sops/${sop.document.id}/acknowledge`);
    expect(second.body.data.alreadyAcknowledged).toBe(true);

    const pendingAfter = await as(worker).get('/sops/pending-acknowledgement');
    expect(pendingAfter.body.data.some((s: { id: string }) => s.id === sop.document.id)).toBe(false);

    const detail = await as(worker).get(`/sops/${sop.document.id}`);
    expect(detail.body.data.acknowledgedByMe).toBe(true);
    expect(detail.body.data.acknowledgements).toHaveLength(1);
  });

  it('only lets quality staff author SOPs and validates input', async () => {
    const breeder = await actor('Breeder');
    const inspector = await actor('Inspector');
    expect(
      (await as(breeder).post('/sops', { title: 'x', department: 'production', ownerEmail: 'a@b.co', content: 'c' })).status,
    ).toBe(403);
    expect((await as(inspector).post('/sops', { title: 'x', department: 'nonsense', ownerEmail: 'a@b.co', content: 'c' })).status).toBe(400);
    expect((await as(inspector).post('/sops', { title: 'x', department: 'production', ownerEmail: 'not-an-email', content: 'c' })).status).toBe(400);
    expect((await request(app).get(`${API}/sops`)).status).toBe(401);
  });
});

describe('quality: non-conformance and CAPA', () => {
  it('lets any role raise an NCR and defaults the due date from severity', async () => {
    const breeder = await actor('Breeder');
    const res = await as(breeder).post('/ncrs', { ...NCR_BODY, severity: 'minor' });
    expect(res.status).toBe(201);
    expect(res.body.data.ncr.ncr_code).toMatch(/^NCR-\d{4}-\d{4}$/);
    expect(res.body.data.ncr.raised_by).toBe(breeder.user.email);
    const due = new Date(res.body.data.ncr.due_date).getTime();
    expect(Math.round((due - Date.now()) / 86_400_000)).toBeGreaterThanOrEqual(59);
  });

  it('hands out unique codes under concurrent creation', async () => {
    const breeder = await actor('Breeder');
    const results = await Promise.all(Array.from({ length: 8 }, () => as(breeder).post('/ncrs', { ...NCR_BODY, severity: 'minor' })));
    expect(results.every((r) => r.status === 201)).toBe(true);
    const codes = results.map((r) => r.body.data.ncr.ncr_code);
    expect(new Set(codes).size).toBe(8);
  });

  it('closes a minor NCR with a root cause but refuses without one', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const ncr = (await as(inspector).post('/ncrs', { ...NCR_BODY, severity: 'minor' })).body.data.ncr;

    const noRoot = await as(admin).post(`/ncrs/${ncr.id}/close`, { closureNotes: 'Fixed' });
    expect(noRoot.status).toBe(400);
    expect(noRoot.body.message).toMatch(/root cause/i);

    const closed = await as(admin).post(`/ncrs/${ncr.id}/close`, { closureNotes: 'Fixed', rootCause: 'Operator skipped step 3' });
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe('closed');
    expect(closed.body.data.closed_by).toBe(admin.user.email);

    // Terminal: cannot be modified afterwards.
    expect((await as(inspector).patch(`/ncrs/${ncr.id}`, { assignedTo: 'x@example.com' })).status).toBe(409);
  });

  it('requires a CAPA for a major NCR and blocks closure while any CAPA is unfinished', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const ncr = (await as(inspector).post('/ncrs', NCR_BODY)).body.data.ncr;
    await as(inspector).patch(`/ncrs/${ncr.id}`, { rootCause: 'Meter drift' });

    const noCapa = await as(admin).post(`/ncrs/${ncr.id}/close`, { closureNotes: 'Done' });
    expect(noCapa.status).toBe(409);
    expect(noCapa.body.message).toMatch(/at least one corrective or preventive action/i);

    const capa = (
      await as(inspector).post('/capas', {
        ncrId: ncr.id,
        actionType: 'corrective',
        title: 'Recalibrate',
        description: 'Recalibrate meter',
        ownerEmail: inspector.user.email,
        dueDate: inDays(7),
      })
    ).body.data;

    const openCapa = await as(admin).post(`/ncrs/${ncr.id}/close`, { closureNotes: 'Done' });
    expect(openCapa.status).toBe(409);
    expect(openCapa.body.message).toContain(capa.capa_code);
  });

  it('runs the full spine: NCR -> CAPA -> implement -> independent verification -> NCR closes', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const ncr = (await as(inspector).post('/ncrs', NCR_BODY)).body.data.ncr;
    expect(ncr.status).toBe('open');

    const capa = (
      await as(inspector).post('/capas', {
        ncrId: ncr.id,
        actionType: 'corrective',
        title: 'Recalibrate',
        description: 'Recalibrate meter',
        ownerEmail: inspector.user.email,
        dueDate: inDays(7),
      })
    ).body.data;

    // Adding a CAPA moves the NCR into investigation.
    expect((await as(admin).get(`/ncrs/${ncr.id}`)).body.data.status).toBe('investigating');

    expect((await as(inspector).post(`/capas/${capa.id}/start`)).body.data.status).toBe('in_progress');
    const impl = await as(inspector).post(`/capas/${capa.id}/implement`, { implementationNotes: 'Done and photographed' });
    expect(impl.body.data.status).toBe('implemented');

    // Owner cannot verify their own action — even where the role gate would allow it.
    const ownerAdmin = await actor('Admin');
    const ownedByAdmin = (
      await as(ownerAdmin).post('/capas', {
        ncrId: ncr.id,
        actionType: 'preventive',
        title: 'Add second reading',
        description: 'Two readings per bag',
        ownerEmail: ownerAdmin.user.email,
        dueDate: inDays(7),
      })
    ).body.data;
    await as(ownerAdmin).post(`/capas/${ownedByAdmin.id}/implement`, { implementationNotes: 'SOP updated' });
    const selfVerify = await as(ownerAdmin).post(`/capas/${ownedByAdmin.id}/verify`, { result: 'effective', effectivenessNotes: 'ok' });
    expect(selfVerify.status).toBe(403);

    // A different Admin verifies both.
    const verify1 = await as(admin).post(`/capas/${capa.id}/verify`, { result: 'effective', effectivenessNotes: 'No recurrence' });
    expect(verify1.body.data.status).toBe('closed');
    expect(verify1.body.data.verified_by).toBe(admin.user.email);
    await as(admin).post(`/capas/${ownedByAdmin.id}/verify`, { result: 'effective', effectivenessNotes: 'Confirmed' });

    await as(inspector).patch(`/ncrs/${ncr.id}`, { rootCause: 'Meter drift' });
    const close = await as(admin).post(`/ncrs/${ncr.id}/close`, { closureNotes: 'Actions verified effective' });
    expect(close.status).toBe(200);
    expect(close.body.data.status).toBe('closed');

    // Every step is on the audit trail.
    const audit = await pool.query(`SELECT action FROM audit_logs WHERE entity_type = 'capa' AND entity_id = $1 ORDER BY created_at`, [capa.id]);
    expect(audit.rows.map((r: { action: string }) => r.action)).toEqual(['CREATE', 'START', 'IMPLEMENT', 'VERIFY_EFFECTIVE']);
  });

  it('sends an ineffective CAPA back to in_progress and keeps the NCR open', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const ncr = (await as(inspector).post('/ncrs', NCR_BODY)).body.data.ncr;
    const capa = (
      await as(inspector).post('/capas', {
        ncrId: ncr.id,
        actionType: 'corrective',
        title: 'Retrain operator',
        description: 'Retrain',
        ownerEmail: inspector.user.email,
        dueDate: inDays(7),
      })
    ).body.data;
    await as(inspector).post(`/capas/${capa.id}/implement`, { implementationNotes: 'Training delivered' });

    const verdict = await as(admin).post(`/capas/${capa.id}/verify`, { result: 'ineffective', effectivenessNotes: 'Same defect on next lot' });
    expect(verdict.body.data.status).toBe('in_progress');
    expect(verdict.body.data.verification_count).toBe(1);
    expect(verdict.body.data.effectiveness_result).toBe('ineffective');

    await as(inspector).patch(`/ncrs/${ncr.id}`, { rootCause: 'Training gap' });
    expect((await as(admin).post(`/ncrs/${ncr.id}/close`, { closureNotes: 'x' })).status).toBe(409);
  });

  it('only the CAPA owner or an Admin may work it; validates due date and state order', async () => {
    const inspectorA = await actor('Inspector');
    const inspectorB = await actor('Inspector');
    const admin = await actor('Admin');
    const ncr = (await as(inspectorA).post('/ncrs', NCR_BODY)).body.data.ncr;

    const past = await as(inspectorA).post('/capas', {
      ncrId: ncr.id,
      actionType: 'corrective',
      title: 't',
      description: 'd',
      ownerEmail: inspectorA.user.email,
      dueDate: '2020-01-01',
    });
    expect(past.status).toBe(400);

    const capa = (
      await as(inspectorA).post('/capas', {
        ncrId: ncr.id,
        actionType: 'corrective',
        title: 't',
        description: 'd',
        ownerEmail: inspectorA.user.email,
        dueDate: inDays(5),
      })
    ).body.data;

    expect((await as(inspectorB).post(`/capas/${capa.id}/implement`, { implementationNotes: 'sneaky' })).status).toBe(403);
    // Cannot verify before it is implemented.
    expect((await as(admin).post(`/capas/${capa.id}/verify`, { result: 'effective', effectivenessNotes: 'n' })).status).toBe(409);
    // Admin may act for an absent owner.
    expect((await as(admin).post(`/capas/${capa.id}/implement`, { implementationNotes: 'covered for owner' })).status).toBe(200);
  });

  it('flags overdue records and supports filters', async () => {
    const inspector = await actor('Inspector');
    const ncr = (await as(inspector).post('/ncrs', { ...NCR_BODY, dueDate: inDays(-3) })).body.data.ncr;
    const list = await as(inspector).get('/ncrs?overdue=true');
    const found = list.body.data.find((n: { id: string }) => n.id === ncr.id);
    expect(found.is_overdue).toBe(true);

    const byStatus = await as(inspector).get('/ncrs?status=closed&department=production');
    expect(byStatus.body.data.every((n: { status: string }) => n.status === 'closed')).toBe(true);
  });

  it('refuses to cancel an NCR that has live CAPAs', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const ncr = (await as(inspector).post('/ncrs', NCR_BODY)).body.data.ncr;
    await as(inspector).post('/capas', {
      ncrId: ncr.id,
      actionType: 'corrective',
      title: 't',
      description: 'd',
      ownerEmail: inspector.user.email,
      dueDate: inDays(5),
    });
    expect((await as(admin).post(`/ncrs/${ncr.id}/cancel`, { reason: 'duplicate' })).status).toBe(409);
  });
});

describe('quality: lot holds (stop-sale)', () => {
  it('places a critical-NCR lot on hold, blocks allocation and packaging, and releases only after the NCR closes', async () => {
    const admin = await actor('Admin');
    const admin2 = await actor('Admin');
    const inspector = await actor('Inspector');
    const lot = await createTestSeedLot({ stage: 'Certified', quantityTotal: 1000 });

    const raised = await as(inspector).post('/ncrs', { ...NCR_BODY, severity: 'critical', seedLotId: lot.id });
    expect(raised.status).toBe(201);
    expect(raised.body.data.holdPlaced).toBe(true);
    expect(raised.body.message).toMatch(/quality hold/i);
    const ncrId = raised.body.data.ncr.id as string;

    // Allocation is refused while held.
    const allocate = await request(app)
      .post(`/api/v1/production/seed-lots/${lot.id}/allocate`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ allocatedTo: 'Dealer A', quantity: 10 });
    expect(allocate.status).toBe(409);
    expect(allocate.body.message).toMatch(/quality hold/i);

    // Packaging is refused while held.
    const packaging = await request(app)
      .post('/api/v1/production/packaging/batches')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ seedLotId: lot.id, unitSize: 5, unitCount: 10, storageConditions: 'cool dry', shelfLifeMonths: 9 });
    expect(packaging.status).toBe(409);
    expect(packaging.body.message).toMatch(/quality hold/i);

    const holds = await as(admin).get(`/holds?active=true&seedLotId=${lot.id}`);
    expect(holds.body.data).toHaveLength(1);
    const holdId = holds.body.data[0].id as string;

    // Only Admin can release, and never while the NCR that caused the hold is open.
    expect((await as(inspector).post(`/holds/${holdId}/release`, { releaseNotes: 'x' })).status).toBe(403);
    const early = await as(admin).post(`/holds/${holdId}/release`, { releaseNotes: 'looks fine' });
    expect(early.status).toBe(409);
    expect(early.body.message).toMatch(/close NCR/i);

    // Drive the NCR to closure (critical needs a verified CAPA).
    const capa = (
      await as(inspector).post('/capas', {
        ncrId,
        actionType: 'corrective',
        title: 'Re-test lot',
        description: 'Full re-test',
        ownerEmail: inspector.user.email,
        dueDate: inDays(5),
      })
    ).body.data;
    await as(inspector).post(`/capas/${capa.id}/implement`, { implementationNotes: 'Re-tested, passes' });
    await as(admin2).post(`/capas/${capa.id}/verify`, { result: 'effective', effectivenessNotes: 'Re-test within spec' });
    await as(admin).post(`/ncrs/${ncrId}/close`, { closureNotes: 'Contained', rootCause: 'Storage humidity excursion' });

    const noNotes = await as(admin).post(`/holds/${holdId}/release`, {});
    expect(noNotes.status).toBe(400);
    const released = await as(admin).post(`/holds/${holdId}/release`, { releaseNotes: 'Re-test passed, NCR closed' });
    expect(released.status).toBe(200);
    expect(released.body.data.released_by).toBe(admin.user.email);

    const allocateAfter = await request(app)
      .post(`/api/v1/production/seed-lots/${lot.id}/allocate`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ allocatedTo: 'Dealer A', quantity: 10 });
    expect(allocateAfter.status).toBe(201);
  });

  it('blocks release while ANY open critical NCR references the lot, not just the one that placed the hold', async () => {
    const admin = await actor('Admin');
    const inspector = await actor('Inspector');
    const lot = await createTestSeedLot({ stage: 'Certified', quantityTotal: 300 });

    const first = (await as(inspector).post('/ncrs', { ...NCR_BODY, severity: 'critical', seedLotId: lot.id })).body.data.ncr;
    const second = (await as(inspector).post('/ncrs', { ...NCR_BODY, severity: 'critical', seedLotId: lot.id })).body.data.ncr;
    const holdId = (await as(admin).get(`/holds?active=true&seedLotId=${lot.id}`)).body.data[0].id as string;

    // The hold's source NCR is cancelled, but the second critical NCR is still open.
    expect((await as(admin).post(`/ncrs/${first.id}/cancel`, { reason: 'duplicate report' })).status).toBe(200);
    const blocked = await as(admin).post(`/holds/${holdId}/release`, { releaseNotes: 'source NCR cancelled' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toContain(second.ncr_code);

    expect((await as(admin).post(`/ncrs/${second.id}/cancel`, { reason: 'also duplicate' })).status).toBe(200);
    const released = await as(admin).post(`/holds/${holdId}/release`, { releaseNotes: 'both NCRs resolved' });
    expect(released.status).toBe(200);
  });

  it('supports a manual hold, rejects a duplicate, and reports lot impact', async () => {
    const admin = await actor('Admin');
    const inspector = await actor('Inspector');
    const lot = await createTestSeedLot({ stage: 'Certified', quantityTotal: 500 });

    // Allocate and package first so the impact view has something to show.
    await request(app)
      .post(`/api/v1/production/seed-lots/${lot.id}/allocate`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ allocatedTo: 'Dealer North', quantity: 50 });
    const pkg = await request(app)
      .post('/api/v1/production/packaging/batches')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ seedLotId: lot.id, unitSize: 5, unitCount: 4, storageConditions: 'cool dry', shelfLifeMonths: 9 });
    expect(pkg.status).toBe(201);

    const hold = await as(inspector).post('/holds', { seedLotId: lot.id, reason: 'Suspected mix-up at bagging' });
    expect(hold.status).toBe(201);
    expect((await as(inspector).post('/holds', { seedLotId: lot.id, reason: 'again' })).status).toBe(409);
    expect((await as(inspector).post('/holds', { seedLotId: lot.id })).status).toBe(400);

    const impact = await as(admin).get(`/lots/${lot.id}/impact`);
    expect(impact.status).toBe(200);
    expect(impact.body.data.summary.activeHold).toBe(true);
    expect(impact.body.data.summary.packagingBatchCount).toBe(1);
    expect(impact.body.data.summary.unitsPackaged).toBe(4);
    expect(impact.body.data.summary.recipients).toEqual(['Dealer North']);
    expect((await as(admin).get('/lots/00000000-0000-0000-0000-000000000000/impact')).status).toBe(404);
  });
});

describe('quality: complaints', () => {
  it('logs a minor complaint without raising an NCR', async () => {
    const producer = await actor('Producer');
    const res = await as(producer).post('/complaints', {
      source: 'dealer',
      complainantName: 'Ramesh Traders',
      title: 'Bag label smudged',
      description: 'Printing unclear on two bags',
      severity: 'minor',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.complaint.complaint_code).toMatch(/^CMP-\d{4}-\d{4}$/);
    expect(res.body.data.ncr).toBeNull();
    expect(res.body.data.complaint.ncr_id).toBeNull();
  });

  it('auto-raises a linked NCR for a major complaint, and NCR + lot hold for a critical one', async () => {
    const producer = await actor('Producer');
    const admin = await actor('Admin');
    const lot = await createTestSeedLot({ stage: 'Certified', quantityTotal: 300 });

    const major = await as(producer).post('/complaints', {
      source: 'farmer',
      complainantName: 'S. Patil',
      title: 'Poor germination in field',
      description: 'About 40% emergence',
      severity: 'major',
      seedLotId: lot.id,
    });
    expect(major.status).toBe(201);
    expect(major.body.data.ncr.source).toBe('complaint');
    expect(major.body.data.ncr.complaint_id).toBe(major.body.data.complaint.id);
    expect(major.body.data.complaint.ncr_id).toBe(major.body.data.ncr.id);
    expect(major.body.data.hold).toBeNull(); // major does not stop-sale by itself

    const critical = await as(producer).post('/complaints', {
      source: 'distributor',
      complainantName: 'Agro Hub',
      title: 'Off-type plants across entire consignment',
      description: 'Widespread off-types',
      severity: 'critical',
      seedLotId: lot.id,
    });
    expect(critical.status).toBe(201);
    expect(critical.body.data.hold).not.toBeNull();
    expect(critical.body.data.hold.seed_lot_id).toBe(lot.id);
    expect(critical.body.message).toMatch(/quality hold/i);

    const detail = await as(admin).get(`/complaints/${critical.body.data.complaint.id}`);
    expect(detail.body.data.ncr.ncr_code).toBe(critical.body.data.ncr.ncr_code);
    expect(detail.body.data.lot_code).toBe(lot.lot_code);
  });

  it('cannot close until resolved, and not until the linked NCR is closed', async () => {
    const producer = await actor('Producer');
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const verifier = await actor('Admin');

    const created = await as(producer).post('/complaints', {
      source: 'dealer',
      complainantName: 'Agro Mart',
      title: 'Low purity',
      description: 'Foreign seed seen',
      severity: 'major',
    });
    const complaintId = created.body.data.complaint.id as string;
    const ncrId = created.body.data.ncr.id as string;

    expect((await as(admin).post(`/complaints/${complaintId}/close`)).status).toBe(409);

    const noOutcome = await as(inspector).post(`/complaints/${complaintId}/resolve`, { rootCause: 'x' });
    expect(noOutcome.status).toBe(400);

    expect((await as(inspector).post(`/complaints/${complaintId}/investigate`, { recallRecommended: true })).body.data.status).toBe('investigating');
    const resolved = await as(inspector).post(`/complaints/${complaintId}/resolve`, {
      rootCause: 'Cleaning line changeover',
      resolution: 'Replaced stock, credited dealer',
    });
    expect(resolved.body.data.status).toBe('resolved');
    expect(resolved.body.data.recall_recommended).toBe(true); // sticky once flagged

    const blocked = await as(admin).post(`/complaints/${complaintId}/close`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toMatch(/close NCR-/i);

    // Close the linked NCR, then the complaint closes.
    const capa = (
      await as(inspector).post('/capas', {
        ncrId,
        complaintId,
        actionType: 'corrective',
        title: 'Line clearance checklist',
        description: 'Introduce line clearance',
        ownerEmail: inspector.user.email,
        dueDate: inDays(5),
      })
    ).body.data;
    await as(inspector).post(`/capas/${capa.id}/implement`, { implementationNotes: 'Checklist live' });
    await as(verifier).post(`/capas/${capa.id}/verify`, { result: 'effective', effectivenessNotes: 'Audited 3 changeovers' });
    await as(admin).post(`/ncrs/${ncrId}/close`, { closureNotes: 'Done', rootCause: 'Cleaning line changeover' });

    const closed = await as(admin).post(`/complaints/${complaintId}/close`);
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe('closed');
  });

  it('validates complaint input', async () => {
    const producer = await actor('Producer');
    const base = { source: 'farmer', complainantName: 'A', title: 't', description: 'd', severity: 'minor' };
    expect((await as(producer).post('/complaints', { ...base, severity: 'catastrophic' })).status).toBe(400);
    expect((await as(producer).post('/complaints', { ...base, complainantName: '' })).status).toBe(400);
    expect((await as(producer).post('/complaints', { ...base, receivedDate: '2999-01-01' })).status).toBe(400);
    expect((await as(producer).post('/complaints', { ...base, seedLotId: '00000000-0000-0000-0000-000000000000' })).status).toBe(404);
  });
});

describe('quality: dashboard', () => {
  it('reports live counts and SOP department coverage', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const verifier = await actor('Admin');

    const sop = await createSop(inspector, { department: 'operations' });
    await as(inspector).post(`/sops/${sop.document.id}/submit`);
    await as(admin).post(`/sops/${sop.document.id}/approve`);
    await ncrWithClosedCapa(inspector, verifier);
    await as(inspector).post('/ncrs', { ...NCR_BODY, severity: 'critical' });

    const res = await as(admin).get('/dashboard');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.sops.effective).toBeGreaterThanOrEqual(1);
    expect(d.sops.departmentsTotal).toBe(9);
    expect(d.sops.departmentCoverage.find((x: { department: string }) => x.department === 'operations').covered).toBe(true);
    expect(d.sops.coveragePercent).toBe(Math.round((d.sops.departmentsCovered / 9) * 100));
    expect(d.nonConformances.open_critical).toBeGreaterThanOrEqual(1);
    expect(d.capas.closed_total).toBeGreaterThanOrEqual(1);
    expect(d.complaints).toHaveProperty('open_total');
    expect(d.holds).toHaveProperty('active');
    expect(d.compliance_score).toBeUndefined(); // no invented composite score
  });
});
