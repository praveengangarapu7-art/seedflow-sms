import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestUser } from '../factories';
import { loginAs } from './authHelper';
import { app } from './testApp';

const API = '/api/v1/module-records';

async function token(): Promise<string> {
  return loginAs(await createTestUser({ role: 'Producer' }));
}

describe('module records (generic persistent store)', () => {
  it('requires authentication and a valid collection name', async () => {
    expect((await request(app).get(`${API}/procurement.orders`)).status).toBe(401);
    const t = await token();
    const bad = await request(app).get(`${API}/Bad Name`).set('Authorization', `Bearer ${t}`);
    expect(bad.status).toBe(400);
  });

  it('seeds once, then syncs upserts and deletes with an audit trail', async () => {
    const t = await token();
    const name = `test.coll_${randomUUID().slice(0, 8)}`;
    const empty = await request(app).get(`${API}/${name}`).set('Authorization', `Bearer ${t}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toMatchObject({ seeded: false, items: [] });

    const seed = [{ id: 'A', data: { id: 'A', qty: 1 }, position: 0 }, { id: 'B', data: { id: 'B', qty: 2 }, position: 1 }];
    const first = await request(app).post(`${API}/${name}/sync`).set('Authorization', `Bearer ${t}`).send({ seed, actor: 'Praveen' });
    expect(first.body.data.seeded).toBe(true);
    // A second browser seeding concurrently must not duplicate or overwrite.
    const second = await request(app).post(`${API}/${name}/sync`).set('Authorization', `Bearer ${t}`).send({ seed: [{ id: 'Z', data: { id: 'Z' } }] });
    expect(second.body.data.seeded).toBe(false);

    await request(app).post(`${API}/${name}/sync`).set('Authorization', `Bearer ${t}`)
      .send({ upserts: [{ id: 'A', data: { id: 'A', qty: 5 } }, { id: 'C', data: { id: 'C', qty: 9 } }], deletes: ['B'], actor: 'Praveen' })
      .expect(200);

    const list = await request(app).get(`${API}/${name}`).set('Authorization', `Bearer ${t}`);
    expect(list.body.data.seeded).toBe(true);
    const items = list.body.data.items as { id: string; qty: number }[];
    expect(items.map((i) => i.id)).toEqual(['C', 'A']); // new records first, B deleted, Z never seeded
    expect(items.find((i) => i.id === 'A')?.qty).toBe(5);

    const audit = await pool.query(`SELECT action FROM audit_logs WHERE entity_type = 'module_record' AND metadata->>'collection' = $1 ORDER BY created_at`, [name]);
    expect(audit.rows.map((r) => r.action)).toEqual(expect.arrayContaining(['seed', 'update', 'create', 'delete']));

    // Deleting everything never brings starter data back.
    await request(app).post(`${API}/${name}/sync`).set('Authorization', `Bearer ${t}`).send({ deletes: ['A', 'C'] }).expect(200);
    const after = await request(app).get(`${API}/${name}`).set('Authorization', `Bearer ${t}`);
    expect(after.body.data).toMatchObject({ seeded: true, items: [] });
  });

  it('rejects records without ids', async () => {
    const t = await token();
    const res = await request(app).post(`${API}/test.noid/sync`).set('Authorization', `Bearer ${t}`).send({ upserts: [{ data: { x: 1 } }] });
    expect(res.status).toBe(400);
  });
});
