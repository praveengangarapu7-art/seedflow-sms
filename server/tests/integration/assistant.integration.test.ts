import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestSeedLot, createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('AI assistant API', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/assistant/ask').send({ question: 'anything' });
    expect(res.status).toBe(401);
  });

  it('rejects an empty question', async () => {
    const user = await createTestUser({ role: 'Admin' });
    const token = await loginAs(user);
    const res = await request(app)
      .post('/api/v1/assistant/ask')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: '   ' });
    expect(res.status).toBe(400);
  });

  it('reports whether an external model is configured', async () => {
    const user = await createTestUser({ role: 'Admin' });
    const token = await loginAs(user);
    const res = await request(app).get('/api/v1/assistant/status').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.modelConfigured).toBe('boolean');
  });

  it('answers a low-stock question from real data, citing the records it used', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    // Available (1000 - 995 = 5) is below the 100 threshold, so this lot must appear.
    const lot = await createTestSeedLot({
      lotCode: `SL-LOW-${suffix}`,
      quantityTotal: 1000,
      quantityAllocated: 995,
      lowStockThreshold: 100,
    });

    const res = await request(app)
      .post('/api/v1/assistant/ask')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'which seed lots are low on stock?' });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('low_stock');
    expect(res.body.data.answer).toContain(lot.lot_code);
    // Citations point at a real front-end route the user can open.
    expect(res.body.data.citations.length).toBeGreaterThan(0);
    expect(res.body.data.citations.every((c: { path: string }) => c.path.startsWith('/'))).toBe(true);
    expect(res.body.data.suggestions.length).toBeGreaterThan(0);
  });

  it('falls back to the deterministic engine when no model is configured, rather than erroring', async () => {
    // The test environment sets no AI_API_KEY, so this exercises the exact
    // path a deployment without a key takes.
    const user = await createTestUser({ role: 'Producer' });
    const token = await loginAs(user);

    const res = await request(app)
      .post('/api/v1/assistant/ask')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'give me a general overview' });

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('rules');
    expect(res.body.data.modelName).toBeNull();
    expect(res.body.data.answer.length).toBeGreaterThan(0);
  });

  it('answers a laboratory question without leaking an error when there is no lab data', async () => {
    const user = await createTestUser({ role: 'Inspector' });
    const token = await loginAs(user);
    const res = await request(app)
      .post('/api/v1/assistant/ask')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'are there any failing lab results?' });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('lab_failures');
    expect(typeof res.body.data.answer).toBe('string');
  });

  it('exposes no write endpoints — the assistant router is read-only', async () => {
    const user = await createTestUser({ role: 'Admin' });
    const token = await loginAs(user);
    // Any mutating verb/path under /assistant must 404 rather than do work.
    for (const path of ['/api/v1/assistant/ask', '/api/v1/assistant/status']) {
      const del = await request(app).delete(path).set('Authorization', `Bearer ${token}`);
      expect(del.status).toBe(404);
      const put = await request(app).put(path).set('Authorization', `Bearer ${token}`);
      expect(put.status).toBe(404);
    }
  });
});
