import type { CopilotAction, CopilotActionInfo, CopilotFinding, CopilotRecord, CopilotRecordType, CopilotResult } from './types';
import { daysFromToday, finding, lower, sortFindings, str } from './util';
import { QUALITY_TYPES } from './quality';
import { PROCUREMENT_TYPES } from './procurement';
import { OPERATIONS_TYPES } from './operations';
import { PRODUCTION_TYPES } from './production';

export * from './types';

const DONE = /(closed|completed|cancelled|resolved|approved|rejected|delivered|harvested|released)/;

/** Works on any record: key facts, overdue dates and open status. Added to every record type. */
const summarize: CopilotAction = {
  id: 'summarize',
  label: 'Summarise',
  description: 'Plain-language summary of this record with anything overdue.',
  modelTask: 'Summarise this record in plain language for a busy manager: what it is, its current state, anything overdue or at risk, and the single most useful next step.',
  run: (r) => {
    const findings: CopilotFinding[] = [];
    const status = lower(r.status);
    for (const [k, v] of Object.entries(r)) {
      if (!/(due|deadline|expected|target_date|expiry|next_review)/i.test(k)) continue;
      const d = daysFromToday(v);
      if (d === null) continue;
      const label = k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
      if (d < 0 && !DONE.test(status)) findings.push(finding('warning', `${label[0].toUpperCase()}${label.slice(1)} passed ${-d} days ago.`));
      else if (d >= 0 && d <= 7 && !DONE.test(status)) findings.push(finding('info', `${label[0].toUpperCase()}${label.slice(1)} in ${d} days.`));
    }
    const facts = Object.entries(r)
      .filter(([k, v]) => (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') && str(v) && !/(^id$|_id$|Id$|password|token|account|ifsc|pan$)/i.test(k) && str(v).length < 120)
      .slice(0, 14)
      .map(([k, v]) => `${k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')}: ${str(v)}`);
    if (status) findings.push(finding(DONE.test(status) ? 'good' : 'info', `Status: ${str(r.status)}.`));
    const name = str(r.title) || str(r.name) || str(r.code) || str(r.id);
    return {
      title: 'Summary',
      summary: name ? `${name}${status ? ` — ${str(r.status)}` : ''}.` : 'Record summary.',
      findings: sortFindings(findings),
      suggestions: [],
      draft: facts.length ? { label: 'Key facts', text: facts.join('\n') } : null,
    };
  },
};

const ALL: CopilotRecordType[] = [...QUALITY_TYPES, ...PROCUREMENT_TYPES, ...OPERATIONS_TYPES, ...PRODUCTION_TYPES].map((t) => ({
  ...t,
  actions: [...t.actions, summarize],
}));

const BY_KEY = new Map(ALL.map((t) => [t.key, t]));

export function copilotRecordTypes(): { key: string; label: string; module: string; actions: CopilotActionInfo[] }[] {
  return ALL.map((t) => ({ key: t.key, label: t.label, module: t.module, actions: t.actions.map(({ id, label, description, modelTask }) => ({ id, label, description, modelTask })) }));
}

export function isCopilotRecordType(key: string): boolean {
  return BY_KEY.has(key);
}

export function copilotActions(recordType: string): CopilotActionInfo[] {
  const t = BY_KEY.get(recordType);
  return t ? t.actions.map(({ id, label, description, modelTask }) => ({ id, label, description, modelTask })) : [];
}

export function findCopilotAction(recordType: string, actionId: string): { type: CopilotRecordType; action: CopilotAction } | null {
  const type = BY_KEY.get(recordType);
  const action = type?.actions.find((a) => a.id === actionId);
  return type && action ? { type, action } : null;
}

/** Runs the deterministic rules. Never throws: a rule bug degrades to a short notice. */
export function runCopilotRules(recordType: string, actionId: string, record: CopilotRecord): CopilotResult {
  const found = findCopilotAction(recordType, actionId);
  const base = { recordType, action: actionId, source: 'rules' as const, model: null, generatedAt: new Date().toISOString() };
  if (!found) {
    return { ...base, actionLabel: actionId, title: 'Not available', summary: `No AI action "${actionId}" for ${recordType}.`, findings: [], suggestions: [] };
  }
  try {
    const out = found.action.run(record ?? {});
    return { ...base, actionLabel: found.action.label, ...out, score: out.score ?? null, draft: out.draft ?? null };
  } catch (error) {
    return {
      ...base,
      actionLabel: found.action.label,
      title: found.action.label,
      summary: 'This record could not be analysed by the rules engine.',
      findings: [finding('info', error instanceof Error ? error.message : 'Unexpected record shape.')],
      suggestions: [],
    };
  }
}

/**
 * Shrinks a record before it is sent to a language model: drops images and
 * long base64 strings, caps arrays and long text, and strips fields that are
 * personal or financial identifiers.
 */
export function compactRecord(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (/^data:|^[A-Za-z0-9+/=]{400,}$/.test(value)) return '[binary omitted]';
    return value.length > 1200 ? `${value.slice(0, 1200)}…` : value;
  }
  if (typeof value !== 'object') return value;
  if (depth > 4) return '[nested]';
  if (Array.isArray(value)) {
    const items = value.slice(0, 25).map((v) => compactRecord(v, depth + 1));
    return value.length > 25 ? [...items, `[${value.length - 25} more]`] : items;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (/(password|token|secret|accountnumber|account_number|ifsc|bankdetails|pan$|aadhaar|photo|image|avatar)/i.test(k)) continue;
    out[k] = compactRecord(v, depth + 1);
  }
  return out;
}
