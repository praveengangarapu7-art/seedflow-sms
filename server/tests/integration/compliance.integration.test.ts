import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestUser, type TestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

const API = '/api/v1/quality';

interface Actor {
  user: TestUser;
  token: string;
}

async function actor(role: 'Admin' | 'Inspector' | 'Producer'): Promise<Actor> {
  const user = await createTestUser({ role });
  return { user, token: await loginAs(user) };
}

const as = (a: Actor) => ({
  get: (path: string) => request(app).get(`${API}${path}`).set('Authorization', `Bearer ${a.token}`),
  post: (path: string, body: object = {}) => request(app).post(`${API}${path}`).set('Authorization', `Bearer ${a.token}`).send(body),
  put: (path: string, body: object = {}) => request(app).put(`${API}${path}`).set('Authorization', `Bearer ${a.token}`).send(body),
  del: (path: string) => request(app).delete(`${API}${path}`).set('Authorization', `Bearer ${a.token}`),
});

function inDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function newRequirement(a: Actor, overrides: Record<string, unknown> = {}) {
  const res = await as(a).post('/compliance/requirements', {
    regulation: `Test Act ${randomUUID()}`,
    title: 'Labels carry the declared particulars',
    description: 'Every container is tagged',
    category: 'labelling_packaging',
    department: 'production',
    ...overrides,
  });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; req_code: string };
}

const GAP = (overrides: Record<string, unknown> = {}) => ({
  status: 'non_compliant',
  currentStatus: 'Tags are handwritten and omit date of test',
  gap: 'No standard tag template',
  risk: 'high',
  correctiveAction: 'Introduce printed tag template',
  responsibleEmail: 'packing.lead@example.com',
  targetDate: inDays(20),
  ...overrides,
});

describe('compliance register', () => {
  it('lets anyone read but only quality staff add and assess requirements', async () => {
    const admin = await actor('Admin');
    const inspector = await actor('Inspector');
    const producer = await actor('Producer');

    const req = await newRequirement(inspector);
    expect(req.req_code).toMatch(/^REQ-\d{3}$/);

    expect((await as(producer).get('/compliance/requirements')).status).toBe(200);
    expect(
      (await as(producer).post('/compliance/requirements', { regulation: 'x', title: 'y', description: 'z', category: 'other', department: 'quality' }))
        .status,
    ).toBe(403);
    expect((await as(producer).post(`/compliance/requirements/${req.id}/assess`, GAP())).status).toBe(403);
    expect((await as(inspector).post('/compliance/template/seed-company')).status).toBe(403);
    expect((await as(admin).get('/compliance/dashboard')).status).toBe(200);
  });

  it('validates input and refuses a duplicate regulation + title', async () => {
    const inspector = await actor('Inspector');
    expect((await as(inspector).post('/compliance/requirements', { title: 'x' })).status).toBe(400);
    expect(
      (await as(inspector).post('/compliance/requirements', { regulation: 'R', title: 'T', description: 'D', category: 'nonsense', department: 'quality' }))
        .status,
    ).toBe(400);
    const regulation = `Dup Act ${randomUUID()}`;
    await newRequirement(inspector, { regulation, title: 'Same' });
    const again = await as(inspector).post('/compliance/requirements', {
      regulation, title: 'Same', description: 'D', category: 'other', department: 'quality',
    });
    expect(again.status).toBe(409);
  });

  it('requires a risk, owner and future target date for a gap, and a justification for N/A', async () => {
    const inspector = await actor('Inspector');
    const req = await newRequirement(inspector);

    expect((await as(inspector).post(`/compliance/requirements/${req.id}/assess`, { status: 'not_assessed', currentStatus: 'x' })).status).toBe(400);
    expect((await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP({ gap: undefined }))).status).toBe(400);
    expect((await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP({ risk: 'severe' }))).status).toBe(400);
    expect((await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP({ responsibleEmail: 'nope' }))).status).toBe(400);
    expect((await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP({ targetDate: inDays(-2) }))).status).toBe(400);
    expect((await as(inspector).post(`/compliance/requirements/${req.id}/assess`, { status: 'not_applicable' })).status).toBe(400);

    const good = await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP());
    expect(good.status).toBe(200);
    expect(good.body.data.status).toBe('non_compliant');
    expect(good.body.data.assessed_by).toBe(inspector.user.email);

    const na = await as(inspector).post(`/compliance/requirements/${req.id}/assess`, {
      status: 'not_applicable',
      currentStatus: 'We do not export; no consignments in scope',
    });
    expect(na.status).toBe(200);
    expect(na.body.data.gap).toBeNull();
    expect(na.body.data.target_date).toBeNull();
  });

  it('refuses compliant without evidence, then accepts it and schedules a review', async () => {
    const inspector = await actor('Inspector');
    const req = await newRequirement(inspector);
    const verdict = { status: 'compliant', currentStatus: 'Licence displayed at both godowns' };

    const early = await as(inspector).post(`/compliance/requirements/${req.id}/assess`, verdict);
    expect(early.status).toBe(409);
    expect(early.body.message).toMatch(/evidence/i);

    expect((await as(inspector).post(`/compliance/requirements/${req.id}/evidence`, { title: 'Licence copy' })).status).toBe(400);
    const ev = await as(inspector).post(`/compliance/requirements/${req.id}/evidence`, {
      title: 'Licence copy',
      reference: 'DOC-LIC-2026-01',
    });
    expect(ev.status).toBe(201);

    const done = await as(inspector).post(`/compliance/requirements/${req.id}/assess`, verdict);
    expect(done.status).toBe(200);
    expect(done.body.data.next_review_date).toBeTruthy();

    // The only evidence of a compliant requirement cannot be quietly removed.
    const removal = await as(inspector).del(`/compliance/requirements/${req.id}/evidence/${ev.body.data.id}`);
    expect(removal.status).toBe(409);
  });

  it('raises one NCR per gap, maps risk to severity, and blocks "compliant" until the NCR closes', async () => {
    const inspector = await actor('Inspector');
    const admin = await actor('Admin');
    const admin2 = await actor('Admin');
    const req = await newRequirement(inspector);

    // No gap yet -> cannot raise.
    expect((await as(inspector).post(`/compliance/requirements/${req.id}/raise-ncr`)).status).toBe(409);

    await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP({ risk: 'high' }));
    const raised = await as(inspector).post(`/compliance/requirements/${req.id}/raise-ncr`);
    expect(raised.status).toBe(201);
    const ncr = raised.body.data.ncr;
    expect(ncr.severity).toBe('major');
    expect(ncr.source).toBe('internal_audit');
    expect(ncr.assigned_to).toBe('packing.lead@example.com');
    expect(ncr.title).toContain(req.req_code);

    // A second NCR while the first is open is refused.
    expect((await as(inspector).post(`/compliance/requirements/${req.id}/raise-ncr`)).status).toBe(409);

    // Evidence is in, but the NCR is still open -> still cannot be compliant.
    await as(inspector).post(`/compliance/requirements/${req.id}/evidence`, { title: 'New tag template', reference: 'DOC-TAG-01' });
    const blocked = await as(inspector).post(`/compliance/requirements/${req.id}/assess`, { status: 'compliant', currentStatus: 'Template in use' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toContain(ncr.ncr_code);

    // Drive the NCR to closure through the Phase 1 flow.
    const capa = (
      await as(inspector).post('/capas', {
        ncrId: ncr.id,
        actionType: 'corrective',
        title: 'Print tags',
        description: 'Roll out printed template',
        ownerEmail: inspector.user.email,
        dueDate: inDays(10),
      })
    ).body.data;
    await as(inspector).post(`/capas/${capa.id}/implement`, { implementationNotes: 'Template live' });
    await as(admin2).post(`/capas/${capa.id}/verify`, { result: 'effective', effectivenessNotes: 'Next 5 lots tagged correctly' });
    expect((await as(admin).post(`/ncrs/${ncr.id}/close`, { closureNotes: 'Done', rootCause: 'No controlled template existed' })).status).toBe(200);

    const done = await as(inspector).post(`/compliance/requirements/${req.id}/assess`, { status: 'compliant', currentStatus: 'Template in use' });
    expect(done.status).toBe(200);

    const detail = await as(inspector).get(`/compliance/requirements/${req.id}`);
    expect(detail.body.data.requirement.ncr_code).toBe(ncr.ncr_code);
    expect(detail.body.data.evidence).toHaveLength(1);
    expect(detail.body.data.capas).toHaveLength(1);
  });

  it('maps a critical risk to a critical NCR', async () => {
    const inspector = await actor('Inspector');
    const req = await newRequirement(inspector);
    await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP({ risk: 'critical' }));
    const raised = await as(inspector).post(`/compliance/requirements/${req.id}/raise-ncr`);
    expect(raised.body.data.ncr.severity).toBe('critical');
  });

  it('filters, flags overdue gaps and reports totals on the dashboard', async () => {
    const inspector = await actor('Inspector');
    const req = await newRequirement(inspector, { category: 'licensing', title: 'Licence renewal tracked' });
    await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP({ targetDate: inDays(1) }));

    const gaps = await as(inspector).get('/compliance/requirements?status=non_compliant&category=licensing');
    expect(gaps.status).toBe(200);
    expect(gaps.body.data.some((r: { id: string }) => r.id === req.id)).toBe(true);
    expect(gaps.body.data.every((r: { status: string }) => r.status === 'non_compliant')).toBe(true);

    const search = await as(inspector).get('/compliance/requirements?q=Licence%20renewal');
    expect(search.body.data.some((r: { id: string }) => r.id === req.id)).toBe(true);

    const dash = (await as(inspector).get('/compliance/dashboard')).body.data;
    expect(dash.totals.total).toBeGreaterThanOrEqual(1);
    expect(dash.totals.non_compliant).toBeGreaterThanOrEqual(1);
    expect(dash.openGapsByRisk).toHaveProperty('critical');
    expect(dash.assessedOfApplicable.applicable).toBeGreaterThanOrEqual(dash.assessedOfApplicable.assessed);
  });

  it('exports the gap report as CSV with the report columns and neutralises formula cells', async () => {
    const inspector = await actor('Inspector');
    const req = await newRequirement(inspector, { title: 'CSV check requirement' });
    await as(inspector).post(`/compliance/requirements/${req.id}/assess`, GAP({ gap: '=HYPERLINK("http://evil")', risk: 'medium' }));
    await as(inspector).post(`/compliance/requirements/${req.id}/evidence`, { title: 'Photo, tags', reference: 'IMG-1' });

    const res = await as(inspector).get('/compliance/report.csv?q=CSV%20check');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    const text = res.text;
    expect(text).toContain('Requirement');
    expect(text).toContain('Responsible person');
    expect(text).toContain('Target date');
    expect(text).toContain('CSV check requirement');
    expect(text).toContain("'=HYPERLINK");
    expect(text).not.toMatch(/,=HYPERLINK/);
    expect(text).toContain('"Photo, tags (IMG-1)"');
  });

  it('updates a requirement definition and links an SOP', async () => {
    const inspector = await actor('Inspector');
    const req = await newRequirement(inspector);
    const sop = (
      await request(app)
        .post(`${API}/sops`)
        .set('Authorization', `Bearer ${inspector.token}`)
        .send({ title: 'Seed tagging', department: 'production', ownerEmail: 'o@example.com', content: '1. Tag' })
    ).body.data.document;

    const updated = await as(inspector).put(`/compliance/requirements/${req.id}`, {
      regulation: `Seeds Rules edited ${randomUUID()}`,
      reference: 'Rule X',
      title: 'Labels carry the declared particulars',
      description: 'Edited description',
      category: 'labelling_packaging',
      department: 'production',
      sopId: sop.id,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.sop_id).toBe(sop.id);

    const detail = await as(inspector).get(`/compliance/requirements/${req.id}`);
    expect(detail.body.data.requirement.sop_code).toBe(sop.sop_code);
    expect(
      (await as(inspector).put(`/compliance/requirements/${req.id}`, { regulation: 'x', title: 'y', description: 'z', category: 'other', department: 'quality', sopId: randomUUID() }))
        .status,
    ).toBe(404);
    expect((await as(inspector).get(`/compliance/requirements/${randomUUID()}`)).status).toBe(404);
  });

  it('loads the starter template idempotently', async () => {
    const admin = await actor('Admin');
    const first = await as(admin).post('/compliance/template/seed-company');
    expect(first.status).toBe(201);
    expect(first.body.data.templateSize).toBeGreaterThanOrEqual(15);
    const second = await as(admin).post('/compliance/template/seed-company');
    expect(second.body.data.added).toBe(0);
    expect(second.body.data.skipped).toBe(second.body.data.templateSize);
  });
});
