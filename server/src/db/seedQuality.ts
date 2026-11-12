import fs from 'node:fs';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { loadStarterTemplate } from '../modules/quality/compliance.service';
import { SEED_COMPANY_STARTER } from '../modules/quality/compliance.template';
import { pool } from './pool';

/**
 * Demo data for the Quality module: SOP register, non-conformances, CAPAs,
 * complaints, lot holds and a first compliance assessment.
 *
 * The content lives in src/services/qualityDemo.json, one file shared with the
 * front-end's offline demo, so the dashboard shows the same picture whether it
 * is reading this database or the built-in demo set. Dates are stored as day
 * offsets from today so the data always looks current (overdue items stay
 * overdue, reviews stay due). Codes use the current year.
 *
 * Idempotent: if the demo SOP codes already exist it does nothing. It never
 * touches records created by real users. Run after seed:auth and seed:ai
 * (lots referenced by holds / NCRs are the SL-AI-* lots; a record whose lot is
 * missing is created without the lot link, and its hold is skipped).
 */

interface Ver {
  n: number;
  status: 'draft' | 'in_review' | 'effective' | 'superseded' | 'rejected';
  summary: string;
  content: string;
  created_by: string;
  approved_by: string | null;
  effective_offset: number | null;
  next_review_offset: number | null;
  submitted_offset: number | null;
  acks: string[];
}
interface DemoFile {
  lots: Record<string, { server: string; demo: string }>;
  sops: { code: string; title: string; department: string; owner: string; interval: number; versions: Ver[] }[];
  complaints: Record<string, any>[];
  ncrs: Record<string, any>[];
  capas: Record<string, any>[];
  holds: Record<string, any>[];
  requirements: Record<string, any>[];
}

const data = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), '..', 'src', 'services', 'qualityDemo.json'), 'utf8'),
) as DemoFile;

const YEAR = new Date().getFullYear();
const yr = (code: string) => code.replace(/-\d{4}-/, `-${YEAR}-`);
const day = (offset: number | null | undefined) => (offset === null || offset === undefined ? null : offset);

async function lotId(client: PoolClient, ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const code = data.lots[ref]?.server;
  if (!code) return null;
  const r = await client.query<{ id: string }>('SELECT id FROM seed_lots WHERE lot_code = $1', [code]);
  return r.rows[0]?.id ?? null;
}

async function audit(client: PoolClient, entityType: string, id: string, by: string): Promise<void> {
  await client.query(
    `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, metadata)
     VALUES ($1, $2, 'CREATE', $3, '{"source":"demo_seed"}'::jsonb)`,
    [entityType, id, by],
  );
}

async function bumpCounter(client: PoolClient, key: string, value: number): Promise<void> {
  await client.query(
    `INSERT INTO quality_counters (counter_key, last_value) VALUES ($1, $2)
     ON CONFLICT (counter_key) DO UPDATE SET last_value = GREATEST(quality_counters.last_value, EXCLUDED.last_value)`,
    [key, value],
  );
}

async function seedSops(client: PoolClient): Promise<void> {
  const counters = new Map<string, number>();
  for (const sop of data.sops) {
    const doc = await client.query<{ id: string }>(
      `INSERT INTO sop_documents (sop_code, title, department, owner_email, review_interval_months, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() - interval '600 days') RETURNING id`,
      [sop.code, sop.title, sop.department, sop.owner, sop.interval, sop.owner],
    );
    const sopId = doc.rows[0].id;
    await audit(client, 'sop_document', sopId, sop.owner);
    const [, prefix, num] = sop.code.match(/^(SOP-[A-Z]+)-(\d+)$/) ?? [];
    if (prefix) counters.set(prefix, Math.max(counters.get(prefix) ?? 0, Number(num)));

    for (const v of sop.versions) {
      const content = v.content || `Superseded revision ${v.n} of ${sop.title}. See the current version for the procedure in force.`;
      const effective = v.status === 'effective' || v.status === 'superseded';
      const ver = await client.query<{ id: string }>(
        `INSERT INTO sop_versions (sop_id, version_number, title, content, change_summary, status, created_by,
                                   submitted_at, approved_by, approved_at, effective_date, next_review_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 CASE WHEN $8::int IS NULL THEN NULL ELSE now() + make_interval(days => $8::int) END,
                 $9::varchar,
                 CASE WHEN $9::varchar IS NULL OR $10::int IS NULL THEN NULL ELSE now() + make_interval(days => $10::int) END,
                 CASE WHEN $10::int IS NULL THEN NULL ELSE CURRENT_DATE + $10::int END,
                 CASE WHEN $11::int IS NULL THEN NULL ELSE CURRENT_DATE + $11::int END)
         RETURNING id`,
        [
          sopId,
          v.n,
          sop.title,
          content,
          v.summary,
          v.status,
          v.created_by,
          day(v.submitted_offset),
          effective ? v.approved_by : null,
          effective ? day(v.effective_offset) : null,
          effective ? day(v.next_review_offset) : null,
        ],
      );
      for (const email of v.acks) {
        await client.query(
          `INSERT INTO sop_acknowledgements (sop_version_id, user_email, acknowledged_at)
           VALUES ($1, $2, now() + make_interval(days => $3::int)) ON CONFLICT DO NOTHING`,
          [ver.rows[0].id, email, (v.effective_offset ?? -30) + 3],
        );
      }
    }
  }
  for (const [prefix, value] of counters) await bumpCounter(client, prefix, value);
}

async function seedQualityRecords(client: PoolClient): Promise<void> {
  const ids: Record<string, string> = {};
  let maxCmp = 0;
  let maxNcr = 0;
  let maxCapa = 0;
  const num = (code: string) => Number(code.split('-').pop());

  for (const c of data.complaints) {
    const code = yr(c.code);
    maxCmp = Math.max(maxCmp, num(code));
    const r = await client.query<{ id: string }>(
      `INSERT INTO quality_complaints (complaint_code, source, complainant_name, complainant_contact, seed_lot_id, title, description,
                                       severity, status, received_date, assigned_to, root_cause, resolution, recall_recommended,
                                       resolved_at, closed_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CURRENT_DATE + $10::int, $11,$12,$13,$14,
               CASE WHEN $15::int IS NULL THEN NULL ELSE now() + make_interval(days => $15::int) END,
               CASE WHEN $16::int IS NULL THEN NULL ELSE now() + make_interval(days => $16::int) END, $17)
       RETURNING id`,
      [
        code, c.source, c.name, c.contact, await lotId(client, c.lot), c.title, c.description, c.severity, c.status, c.received,
        c.assigned, c.root, c.resolution, c.recall, day(c.resolved), day(c.closed), c.assigned ?? 'inspector@seedsphere.com',
      ],
    );
    ids[c.key] = r.rows[0].id;
    await audit(client, 'quality_complaint', r.rows[0].id, c.assigned ?? 'inspector@seedsphere.com');
  }

  for (const n of data.ncrs) {
    const code = yr(n.code);
    maxNcr = Math.max(maxNcr, num(code));
    const r = await client.query<{ id: string }>(
      `INSERT INTO non_conformances (ncr_code, title, description, department, source, severity, seed_lot_id, status, raised_by,
                                     assigned_to, due_date, root_cause, closure_notes, closed_by, closed_at, complaint_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CURRENT_DATE + $11::int, $12,$13,$14,
               CASE WHEN $15::int IS NULL THEN NULL ELSE now() + make_interval(days => $15::int) END,
               $16, now() + make_interval(days => $17::int))
       RETURNING id`,
      [
        code, n.title, n.description, n.department, n.source, n.severity, await lotId(client, n.lot), n.status, n.raised_by,
        n.assigned, n.due, n.root, n.closure, n.closed_by, day(n.closed), n.complaint ? ids[n.complaint] : null, n.created,
      ],
    );
    ids[n.key] = r.rows[0].id;
    await audit(client, 'non_conformance', r.rows[0].id, n.raised_by);
    if (n.complaint) await client.query('UPDATE quality_complaints SET ncr_id = $1 WHERE id = $2', [r.rows[0].id, ids[n.complaint]]);
  }

  for (const c of data.capas) {
    const code = yr(c.code);
    maxCapa = Math.max(maxCapa, num(code));
    const r = await client.query<{ id: string }>(
      `INSERT INTO capas (capa_code, ncr_id, complaint_id, action_type, title, description, owner_email, due_date, status,
                          implementation_notes, implemented_at, verified_by, verified_at, effectiveness_result,
                          effectiveness_notes, verification_count, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, CURRENT_DATE + $8::int, $9,$10,
               CASE WHEN $11::int IS NULL THEN NULL ELSE now() + make_interval(days => $11::int) END,
               $12,
               CASE WHEN $13::int IS NULL THEN NULL ELSE now() + make_interval(days => $13::int) END,
               $14,$15,$16,$17, now() + make_interval(days => $18::int))
       RETURNING id`,
      [
        code, c.ncr ? ids[c.ncr] : null, c.complaint ? ids[c.complaint] : null, c.type, c.title, c.description, c.owner, c.due,
        c.status, c.implementation_notes, day(c.implemented), c.verified_by, day(c.verified), c.result, c.verification_notes,
        c.verification_count, c.created_by, c.created,
      ],
    );
    ids[c.key] = r.rows[0].id;
    await audit(client, 'capa', r.rows[0].id, c.created_by);
  }

  for (const h of data.holds) {
    const lot = await lotId(client, h.lot);
    if (!lot) {
      console.log(`  skip hold ${h.key}: lot ${data.lots[h.lot]?.server} not found (run seed:ai first)`);
      continue;
    }
    await client.query(
      `INSERT INTO quality_lot_holds (seed_lot_id, reason, source_type, source_id, placed_by, placed_at,
                                      released_by, released_at, release_notes)
       VALUES ($1,$2,$3,$4,$5, now() + make_interval(days => $6::int), $7,
               CASE WHEN $8::int IS NULL THEN NULL ELSE now() + make_interval(days => $8::int) END, $9)`,
      [lot, h.reason, h.source, ids[h.source_key] ?? null, h.placed_by, h.placed, h.released_by, day(h.released), h.release_notes],
    );
  }

  await bumpCounter(client, `CMP-${YEAR}`, maxCmp);
  await bumpCounter(client, `NCR-${YEAR}`, maxNcr);
  await bumpCounter(client, `CAPA-${YEAR}`, maxCapa);

  // Keep the ids for the compliance pass.
  (globalThis as any).__qualityIds = ids;
}

async function seedCompliance(client: PoolClient): Promise<void> {
  const ids = (globalThis as any).__qualityIds as Record<string, string>;
  const admin = await client.query<{ id: string }>("SELECT id FROM users WHERE email = 'admin@seedsphere.com'");
  await loadStarterTemplate({ id: admin.rows[0]?.id ?? '00000000-0000-4000-8000-000000000000', email: 'admin@seedsphere.com', role: 'Admin', organizationId: null } as never);

  for (const req of data.requirements) {
    if (req.status === 'not_assessed') continue;
    const tpl = SEED_COMPANY_STARTER[req.i];
    const found = await client.query<{ id: string }>(
      'SELECT id FROM compliance_requirements WHERE regulation = $1 AND title = $2',
      [tpl.regulation, tpl.title],
    );
    const id = found.rows[0]?.id;
    if (!id) continue;
    const sop = req.sop ? await client.query<{ id: string }>('SELECT id FROM sop_documents WHERE sop_code = $1', [req.sop]) : null;
    const assessedBy = req.responsible ?? 'inspector@seedsphere.com';
    await client.query(
      `UPDATE compliance_requirements
          SET status=$2, current_status=$3, gap=$4, risk=$5, corrective_action=$6, responsible_email=$7,
              target_date = CASE WHEN $8::int IS NULL THEN NULL ELSE CURRENT_DATE + $8::int END,
              sop_id=$9, ncr_id=$10, assessed_by=$11, assessed_at = now() - interval '14 days',
              next_review_date = CASE WHEN $12::int IS NULL THEN NULL ELSE CURRENT_DATE + $12::int END
        WHERE id=$1`,
      [
        id, req.status, req.current, req.gap ?? null, req.risk ?? null, req.action ?? null, req.responsible ?? null,
        req.target ?? null, sop?.rows[0]?.id ?? null, req.ncr ? ids[req.ncr] : null, assessedBy, req.review ?? null,
      ],
    );
    for (const [title, reference] of req.evidence ?? []) {
      await client.query(
        `INSERT INTO compliance_evidence (requirement_id, title, reference, added_by) VALUES ($1,$2,$3,$4)`,
        [id, title, reference, 'inspector@seedsphere.com'],
      );
    }
  }
}

async function run(): Promise<void> {
  const exists = await pool.query('SELECT 1 FROM sop_documents WHERE sop_code = $1', [data.sops[0].code]);
  if (exists.rows.length > 0) {
    console.log('Quality demo data already present — skipping.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedSops(client);
    await seedQualityRecords(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Compliance runs on its own (the starter loader opens its own transaction).
  const c2 = await pool.connect();
  try {
    await seedCompliance(c2);
  } finally {
    c2.release();
  }

  const counts = await pool.query(
    `SELECT (SELECT COUNT(*) FROM sop_documents) AS sops, (SELECT COUNT(*) FROM non_conformances) AS ncrs,
            (SELECT COUNT(*) FROM capas) AS capas, (SELECT COUNT(*) FROM quality_complaints) AS complaints,
            (SELECT COUNT(*) FROM quality_lot_holds WHERE released_at IS NULL) AS holds,
            (SELECT COUNT(*) FROM compliance_requirements) AS requirements`,
  );
  console.log('Quality demo data loaded:', counts.rows[0]);
}

run()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
