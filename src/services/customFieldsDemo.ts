/**
 * Offline/demo implementation of /custom-fields, persisted in localStorage so
 * a field created on the Admin page really does appear (and keep its value)
 * on the other modules' pages while the server is unreachable. Mirrors the
 * server rules in server/src/modules/customFields: a field that applies to
 * seed_lot is stored on the lot, so every module showing that lot shares it.
 */
type Json = string | number | boolean | null;
interface Field {
  id: string; fieldKey: string; label: string; fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options: string[]; entityTypes: string[]; required: boolean; helpText: string | null; sortOrder: number; active: boolean;
}
interface Store { fields: Field[]; values: Record<string, Json> }

const KEY = 'seedsphere.customFields.v1';
const SEED: Field[] = [
  { id: 'cf-demo-1', fieldKey: 'target_moisture_pct', label: 'Target moisture %', fieldType: 'number', options: [],
    entityTypes: ['seed_lot', 'lab_submission', 'warehouse_item'], required: false,
    helpText: 'Set once on the lot; Lab, Warehouse and Quality all see it.', sortOrder: 0, active: true },
  { id: 'cf-demo-2', fieldKey: 'buyer_program', label: 'Buyer / programme', fieldType: 'select',
    options: ['Retail', 'Government programme', 'Export', 'Contract growers'],
    entityTypes: ['seed_lot', 'purchase_order', 'processing_batch'], required: false, helpText: null, sortOrder: 1, active: true },
  { id: 'cf-demo-3', fieldKey: 'special_handling', label: 'Special handling notes', fieldType: 'text', options: [],
    entityTypes: ['seed_lot', 'non_conformance', 'grn'], required: false, helpText: null, sortOrder: 2, active: true },
];

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch { /* fall through to seed */ }
  return { fields: SEED, values: {} };
}
function save(s: Store): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: session-only */ }
}

function target(f: Field, entityType: string, entityId: string, lotId?: string) {
  if (lotId && f.entityTypes.includes('seed_lot')) return { entityType: 'seed_lot', entityId: lotId, shared: true };
  if (f.entityTypes.includes(entityType)) return { entityType, entityId, shared: false };
  return null;
}
const vkey = (fid: string, t: string, id: string) => `${fid}|${t}|${id}`;

function withValues(s: Store, entityType: string, entityId: string, lotId?: string) {
  return s.fields.filter((f) => f.active).flatMap((f) => {
    const t = target(f, entityType, entityId, lotId);
    if (!t) return [];
    const v = s.values[vkey(f.id, t.entityType, t.entityId)];
    return [{ ...f, value: v === undefined ? null : v, storedOn: { entityType: t.entityType, entityId: t.entityId }, shared: t.shared }];
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveCustomFieldsDemo(path: string, method: string, body?: string): unknown | undefined {
  const [p, qs = ''] = path.split('?');
  const q = new URLSearchParams(qs);
  const s = load();
  const payload = body ? (JSON.parse(body) as Record<string, unknown>) : {};

  if (p === '/custom-fields/values') {
    if (method === 'GET') return withValues(s, q.get('entityType') ?? '', q.get('entityId') ?? '', q.get('lotId') ?? undefined);
    const { entityType, entityId, lotId, values } = payload as { entityType: string; entityId: string; lotId?: string; values: Record<string, Json> };
    const applicable = s.fields.filter((f) => f.active && target(f, entityType, entityId, lotId));
    for (const f of applicable) {
      if (!(f.fieldKey in values)) continue;
      const raw = values[f.fieldKey];
      if ((raw === null || raw === '') && f.required) throw new Error(`${f.label} is required`);
      const t = target(f, entityType, entityId, lotId)!;
      let v: Json = raw === '' ? null : raw;
      if (v !== null && f.fieldType === 'number') {
        v = Number(v);
        if (!Number.isFinite(v)) throw new Error(`${f.label} must be a number`);
      }
      s.values[vkey(f.id, t.entityType, t.entityId)] = v;
    }
    save(s);
    return withValues(s, entityType, entityId, lotId);
  }

  if (p === '/custom-fields' && method === 'GET') {
    return s.fields.filter((f) => q.get('all') === 'true' || f.active);
  }
  if (p === '/custom-fields' && method === 'POST') {
    const label = String(payload.label ?? '').trim();
    if (!label) throw new Error('Label is required');
    const key = String(payload.fieldKey || label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (s.fields.some((f) => f.fieldKey === key)) throw new Error(`A field with key "${key}" already exists`);
    const f: Field = {
      id: `cf-${crypto.randomUUID()}`, fieldKey: key, label, fieldType: (payload.fieldType as Field['fieldType']) ?? 'text',
      options: (payload.options as string[]) ?? [], entityTypes: (payload.entityTypes as string[]) ?? [],
      required: Boolean(payload.required), helpText: (payload.helpText as string) || null, sortOrder: s.fields.length, active: true,
    };
    s.fields.push(f);
    save(s);
    return f;
  }
  const m = p.match(/^\/custom-fields\/([^/]+)$/);
  if (m && method === 'PATCH') {
    const f = s.fields.find((x) => x.id === m[1]);
    if (!f) throw new Error('Custom field not found');
    Object.assign(f, {
      ...(payload.label !== undefined ? { label: String(payload.label) } : {}),
      ...(payload.options !== undefined ? { options: payload.options as string[] } : {}),
      ...(payload.entityTypes !== undefined ? { entityTypes: payload.entityTypes as string[] } : {}),
      ...(payload.required !== undefined ? { required: Boolean(payload.required) } : {}),
      ...(payload.helpText !== undefined ? { helpText: (payload.helpText as string) || null } : {}),
      ...(payload.active !== undefined ? { active: Boolean(payload.active) } : {}),
    });
    save(s);
    return f;
  }
  return undefined;
}
