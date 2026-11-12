import { pool } from '../../db/pool';
import articles from './knowledge.articles.json';

/**
 * Retrieval for SeedSphere AI (the "R" in RAG).
 *
 * Index: curated articles + the company's own SOPs, compliance requirements,
 * NCRs, CAPAs and complaints, stored with a weighted full-text vector.
 * Retrieval: a natural-language question is reduced to meaningful words and
 * matched with ts_rank_cd (title > tags > body). The passages returned are
 * what the model is allowed to quote, and what the UI shows as sources.
 */

export interface KnowledgeHit {
  id: string;
  sourceType: string;
  title: string;
  module: string;
  path: string;
  passage: string;
  score: number;
}

interface Doc { sourceType: string; sourceRef: string; title: string; module: string; path: string; tags: string; body: string }

const STOP = new Set(('a an and are as at be but by can could did do does for from had has have how i if in into is it its me my of on or our '
  + 'should so than that the their them then there these they this to us was we were what when where which who why will with would you your '
  + 'show tell give list about please any all lot lots seed seeds seedsphere').split(' '));

export function toTsQuery(question: string): string | null {
  const words = (question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w));
  const unique = [...new Set(words)].slice(0, 12);
  return unique.length ? unique.join(' | ') : null;
}

/** Best ~480 chars of a passage: the paragraph/sentence window with most query words. */
export function bestWindow(body: string, question: string, size = 480): string {
  const words = new Set((question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w)));
  if (body.length <= size) return body;
  const sentences = body.split(/(?<=[.!?])\s+/);
  let best = 0, bestScore = -1;
  for (let i = 0; i < sentences.length; i++) {
    const score = sentences[i].toLowerCase().split(/\W+/).filter((w) => words.has(w)).length;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  let out = sentences[best];
  for (let j = best + 1; j < sentences.length && out.length < size; j++) out += ' ' + sentences[j];
  for (let j = best - 1; j >= 0 && out.length < size * 0.7; j--) out = sentences[j] + ' ' + out;
  return out.length > size + 120 ? out.slice(0, size + 120).trimEnd() + '…' : out;
}

export async function search(question: string, limit = 4): Promise<KnowledgeHit[]> {
  const q = toTsQuery(question);
  if (!q) return [];
  const { rows } = await pool.query<{
    id: string; source_type: string; title: string; module: string; path: string; body: string; rank: number;
  }>(
    `SELECT id, source_type, title, module, path, body, ts_rank_cd(tsv, to_tsquery('english', $1), 32) AS rank
     FROM ai_knowledge_docs WHERE tsv @@ to_tsquery('english', $1)
     ORDER BY rank DESC, updated_at DESC LIMIT $2`,
    [q, limit]);
  return rows.map((r) => ({
    id: r.id, sourceType: r.source_type, title: r.title, module: r.module, path: r.path,
    passage: bestWindow(r.body, question), score: Number(r.rank),
  }));
}

export async function knowledgeStats(): Promise<{ total: number; bySource: Record<string, number> }> {
  try {
    const { rows } = await pool.query<{ source_type: string; n: string }>(
      'SELECT source_type, COUNT(*) AS n FROM ai_knowledge_docs GROUP BY source_type');
    const bySource = Object.fromEntries(rows.map((r) => [r.source_type, Number(r.n)]));
    return { total: rows.reduce((a, r) => a + Number(r.n), 0), bySource };
  } catch {
    return { total: 0, bySource: {} };
  }
}

/** Paragraph-aware chunking so long SOPs become retrievable passages. */
function chunk(text: string, max = 900): string[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + '\n\n' + p).length > max && cur) { out.push(cur); cur = p; } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out.length ? out : [text.slice(0, max)];
}

async function q<T>(sql: string): Promise<T[]> {
  try { return (await pool.query(sql)).rows as T[]; } catch { return []; } // a table not yet migrated must not break indexing
}

async function collectDocs(): Promise<Doc[]> {
  const docs: Doc[] = (articles as { id: string; title: string; module: string; path: string; tags: string; body: string }[])
    .map((a) => ({ sourceType: 'article', sourceRef: a.id, title: a.title, module: a.module, path: a.path, tags: a.tags, body: a.body }));

  const sops = await q<{ id: string; sop_code: string; title: string; department: string; content: string; version_number: number }>(
    `SELECT d.id, d.sop_code, d.title, d.department, v.content, v.version_number
     FROM sop_documents d JOIN LATERAL (
       SELECT content, version_number FROM sop_versions WHERE sop_id = d.id AND status = 'effective'
       ORDER BY version_number DESC LIMIT 1) v ON TRUE`);
  for (const s of sops) chunk(s.content).forEach((c, i) => docs.push({
    sourceType: 'sop', sourceRef: `${s.id}#${i}`, title: `${s.sop_code} ${s.title} (v${s.version_number})`,
    module: 'Quality', path: `/quality/sops/${s.id}`, tags: `sop procedure ${s.department}`, body: c }));

  const reqs = await q<{ id: string; req_code: string; regulation: string; title: string; description: string; status: string; gap: string | null; corrective_action: string | null; department: string }>(
    'SELECT id, req_code, regulation, title, description, status, gap, corrective_action, department FROM compliance_requirements');
  for (const r of reqs) docs.push({
    sourceType: 'compliance', sourceRef: r.id, title: `${r.req_code} ${r.title}`, module: 'Quality', path: `/quality/compliance/${r.id}`,
    tags: `compliance regulation ${r.regulation} ${r.department}`,
    body: `${r.description} Status: ${r.status.replace(/_/g, ' ')}.${r.gap ? ` Gap: ${r.gap}` : ''}${r.corrective_action ? ` Corrective action: ${r.corrective_action}` : ''}` });

  const ncrs = await q<{ id: string; ncr_code: string; title: string; description: string; severity: string; status: string; root_cause: string | null; closure_notes: string | null }>(
    'SELECT id, ncr_code, title, description, severity, status, root_cause, closure_notes FROM non_conformances');
  for (const n of ncrs) docs.push({
    sourceType: 'ncr', sourceRef: n.id, title: `${n.ncr_code} ${n.title}`, module: 'Quality', path: `/quality/ncrs/${n.id}`,
    tags: `non-conformance ncr ${n.severity} ${n.status}`,
    body: `${n.description} Severity ${n.severity}, status ${n.status}.${n.root_cause ? ` Root cause: ${n.root_cause}` : ''}${n.closure_notes ? ` Closure: ${n.closure_notes}` : ''}` });

  const capas = await q<{ id: string; capa_code: string; title: string; description: string; action_type: string; status: string; implementation_notes: string | null }>(
    'SELECT id, capa_code, title, description, action_type, status, implementation_notes FROM capas');
  for (const c of capas) docs.push({
    sourceType: 'capa', sourceRef: c.id, title: `${c.capa_code} ${c.title}`, module: 'Quality', path: '/quality/capas',
    tags: `capa ${c.action_type} action ${c.status}`,
    body: `${c.description} (${c.action_type}, ${c.status}).${c.implementation_notes ? ` Implementation: ${c.implementation_notes}` : ''}` });

  const complaints = await q<{ id: string; complaint_code: string; title: string; description: string; severity: string; status: string; root_cause: string | null; resolution: string | null }>(
    'SELECT id, complaint_code, title, description, severity, status, root_cause, resolution FROM quality_complaints');
  for (const c of complaints) docs.push({
    sourceType: 'complaint', sourceRef: c.id, title: `${c.complaint_code} ${c.title}`, module: 'Quality', path: `/quality/complaints/${c.id}`,
    tags: `complaint customer ${c.severity} ${c.status}`,
    body: `${c.description} Severity ${c.severity}, status ${c.status}.${c.root_cause ? ` Root cause: ${c.root_cause}` : ''}${c.resolution ? ` Resolution: ${c.resolution}` : ''}` });

  return docs;
}

export async function reindexKnowledge(): Promise<{ indexed: number; removed: number; bySource: Record<string, number> }> {
  const docs = await collectDocs();
  for (const d of docs) {
    await pool.query(
      `INSERT INTO ai_knowledge_docs (source_type, source_ref, title, module, path, tags, body)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (source_type, source_ref) DO UPDATE SET title=EXCLUDED.title, module=EXCLUDED.module, path=EXCLUDED.path,
         tags=EXCLUDED.tags, body=EXCLUDED.body, updated_at=NOW()`,
      [d.sourceType, d.sourceRef, d.title.slice(0, 250), d.module, d.path, d.tags, d.body]);
  }
  // Drop documents whose source record no longer exists.
  const keep = docs.map((d) => `${d.sourceType}|${d.sourceRef}`);
  const removed = await pool.query(
    `DELETE FROM ai_knowledge_docs WHERE (source_type || '|' || source_ref) <> ALL($1::text[])`, [keep]);
  const bySource: Record<string, number> = {};
  for (const d of docs) bySource[d.sourceType] = (bySource[d.sourceType] ?? 0) + 1;
  return { indexed: docs.length, removed: removed.rowCount ?? 0, bySource };
}

/** Index lazily the first time retrieval is needed, so a fresh deployment just works. */
let ensured: Promise<void> | null = null;
export function ensureKnowledgeIndexed(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      const { total } = await knowledgeStats();
      if (total === 0) await reindexKnowledge();
    })().catch((e) => { ensured = null; console.warn('[ai] knowledge indexing failed:', (e as Error).message); });
  }
  return ensured;
}
