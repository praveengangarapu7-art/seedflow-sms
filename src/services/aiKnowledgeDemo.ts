import articles from './aiKnowledge.json';
import quality from './qualityDemo.json';

/**
 * Offline copy of the assistant's retrieval step (the server does the same
 * with PostgreSQL full-text search). Builds a small corpus from the shared
 * knowledge articles plus the demo SOPs, NCRs, complaints, CAPAs and
 * compliance requirements, and ranks it with BM25 (title weighted 3x).
 */
export interface DemoKnowledgeHit {
  id: string;
  sourceType: string;
  title: string;
  module: string;
  path: string;
  passage: string;
  score: number;
}

interface Doc { id: string; sourceType: string; title: string; module: string; path: string; tags: string; body: string; tokens: string[] }

const STOP = new Set(('a an and are as at be but by can could did do does for from had has have how i if in into is it its me my of on or our '
  + 'should so than that the their them then there these they this to us was we were what when where which who why will with would you your '
  + 'show tell give list about please any all lot lots seed seeds seedsphere').split(' '));

const words = (t: string) => (t.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '');

let corpus: Doc[] | null = null;

function build(): Doc[] {
  if (corpus) return corpus;
  const docs: Omit<Doc, 'tokens'>[] = [];
  for (const a of articles as { id: string; title: string; module: string; path: string; tags: string; body: string }[]) {
    docs.push({ id: a.id, sourceType: 'article', title: a.title, module: a.module, path: a.path, tags: a.tags, body: a.body });
  }
  for (const s of quality.sops) {
    const v = [...s.versions].reverse().find((x) => x.content) ?? s.versions[s.versions.length - 1];
    if (!v?.content) continue;
    docs.push({ id: `sop-${s.code}`, sourceType: 'sop', title: `${s.code} ${s.title}`, module: 'Quality', path: '/quality/sops', tags: `sop procedure ${s.department}`, body: v.content });
  }
  for (const n of quality.ncrs) {
    docs.push({ id: `ncr-${n.code}`, sourceType: 'ncr', title: `${n.code} ${n.title}`, module: 'Quality', path: '/quality/ncrs', tags: `non-conformance ncr ${n.severity} ${n.status}`,
      body: `${n.description}${n.root ? ` Root cause: ${n.root}` : ''}${n.closure ? ` Closure: ${n.closure}` : ''}` });
  }
  for (const c of quality.complaints) {
    docs.push({ id: `cmp-${c.code}`, sourceType: 'complaint', title: `${c.code} ${c.title}`, module: 'Quality', path: '/quality/complaints', tags: `complaint customer ${c.severity}`,
      body: `${c.description}${c.root ? ` Root cause: ${c.root}` : ''}${c.resolution ? ` Resolution: ${c.resolution}` : ''}` });
  }
  for (const c of quality.capas) {
    docs.push({ id: `capa-${c.code}`, sourceType: 'capa', title: `${c.code} ${c.title}`, module: 'Quality', path: '/quality/capas', tags: `capa ${c.type}`, body: c.description });
  }
  for (const r of quality.starter) {
    docs.push({ id: `req-${r.title}`, sourceType: 'compliance', title: r.title, module: 'Quality', path: '/quality/compliance', tags: `compliance regulation ${r.regulation} ${r.department}`, body: r.description });
  }
  corpus = docs.map((d) => ({ ...d, tokens: [...words(d.title), ...words(d.title), ...words(d.title), ...words(d.tags), ...words(d.body)].map(stem) }));
  return corpus;
}

function bestWindow(body: string, query: string, size = 480): string {
  if (body.length <= size) return body;
  const q = new Set(words(query).map(stem));
  const sentences = body.split(/(?<=[.!?])\s+/);
  let best = 0, top = -1;
  sentences.forEach((s, i) => {
    const score = words(s).filter((w) => q.has(stem(w))).length;
    if (score > top) { top = score; best = i; }
  });
  let out = sentences[best];
  for (let j = best + 1; j < sentences.length && out.length < size; j++) out += ' ' + sentences[j];
  for (let j = best - 1; j >= 0 && out.length < size * 0.7; j--) out = sentences[j] + ' ' + out;
  return out.length > size + 120 ? out.slice(0, size + 120).trimEnd() + '…' : out;
}

export function searchKnowledgeDemo(query: string, limit = 4): DemoKnowledgeHit[] {
  const docs = build();
  const q = [...new Set(words(query).map(stem))];
  if (!q.length) return [];
  const N = docs.length;
  const avg = docs.reduce((a, d) => a + d.tokens.length, 0) / N;
  const df = new Map<string, number>();
  for (const t of q) df.set(t, docs.filter((d) => d.tokens.includes(t)).length);
  const k1 = 1.4, b = 0.75;
  return docs
    .map((d) => {
      let score = 0;
      for (const t of q) {
        const f = d.tokens.filter((x) => x === t).length;
        if (!f) continue;
        const n = df.get(t) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.tokens.length) / avg)));
      }
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, limit)
    .map(({ d, score }) => ({ id: d.id, sourceType: d.sourceType, title: d.title, module: d.module, path: d.path, passage: bestWindow(d.body, query), score }));
}

export function knowledgeStatsDemo(): { total: number; bySource: Record<string, number> } {
  const bySource: Record<string, number> = {};
  for (const d of build()) bySource[d.sourceType] = (bySource[d.sourceType] ?? 0) + 1;
  return { total: build().length, bySource };
}
