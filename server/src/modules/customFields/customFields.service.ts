import { pool } from '../../db/pool';
import { NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';

export const ENTITY_TYPES = [
  'seed_lot', 'supplier', 'purchase_order', 'grn', 'processing_batch',
  'warehouse_item', 'lab_submission', 'non_conformance',
] as const;
export const FIELD_TYPES = ['text', 'number', 'date', 'select', 'boolean'] as const;

export interface CustomField {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: (typeof FIELD_TYPES)[number];
  options: string[];
  entityTypes: string[];
  required: boolean;
  helpText: string | null;
  sortOrder: number;
  active: boolean;
}

interface FieldRow {
  id: string; field_key: string; label: string; field_type: CustomField['fieldType'];
  options: string[]; entity_types: string[]; required: boolean; help_text: string | null;
  sort_order: number; active: boolean;
}

const toField = (r: FieldRow): CustomField => ({
  id: r.id, fieldKey: r.field_key, label: r.label, fieldType: r.field_type,
  options: r.options ?? [], entityTypes: r.entity_types, required: r.required,
  helpText: r.help_text, sortOrder: r.sort_order, active: r.active,
});

interface FieldInput {
  fieldKey?: string; label?: string; fieldType?: string; options?: unknown;
  entityTypes?: unknown; required?: unknown; helpText?: unknown; sortOrder?: unknown; active?: unknown;
}

function cleanEntityTypes(v: unknown): string[] {
  if (!Array.isArray(v) || v.length === 0) throw new ValidationError('Choose at least one place for the field to appear');
  const bad = v.filter((t) => !ENTITY_TYPES.includes(t as never));
  if (bad.length) throw new ValidationError(`Unknown record type: ${bad.join(', ')}`);
  return [...new Set(v as string[])];
}

function cleanOptions(type: string, v: unknown): string[] {
  if (type !== 'select') return [];
  const opts = Array.isArray(v) ? v.map((o) => String(o).trim()).filter(Boolean) : [];
  if (opts.length < 2) throw new ValidationError('A dropdown field needs at least two options');
  return [...new Set(opts)];
}

export async function listFields(opts: { entityType?: string; includeInactive?: boolean }): Promise<CustomField[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!opts.includeInactive) where.push('active = TRUE');
  if (opts.entityType) { params.push(opts.entityType); where.push(`$${params.length} = ANY(entity_types)`); }
  const { rows } = await pool.query<FieldRow>(
    `SELECT * FROM custom_fields ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY sort_order, label`, params);
  return rows.map(toField);
}

export async function createField(input: FieldInput, user: AuthenticatedUser): Promise<CustomField> {
  const label = String(input.label ?? '').trim();
  if (!label) throw new ValidationError('Label is required');
  const type = String(input.fieldType ?? '');
  if (!FIELD_TYPES.includes(type as never)) throw new ValidationError('Choose a field type');
  const key = String(input.fieldKey ?? label).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);
  if (!/^[a-z][a-z0-9_]*$/.test(key)) throw new ValidationError('Field key must start with a letter');
  const exists = await pool.query('SELECT 1 FROM custom_fields WHERE field_key = $1', [key]);
  if (exists.rowCount) throw new ValidationError(`A field with key "${key}" already exists`);
  const { rows } = await pool.query<FieldRow>(
    `INSERT INTO custom_fields (field_key, label, field_type, options, entity_types, required, help_text, sort_order, created_by)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,COALESCE((SELECT MAX(sort_order)+1 FROM custom_fields),0),$8) RETURNING *`,
    [key, label, type, JSON.stringify(cleanOptions(type, input.options)), cleanEntityTypes(input.entityTypes),
      Boolean(input.required), input.helpText ? String(input.helpText).slice(0, 200) : null, user.email]);
  return toField(rows[0]);
}

export async function updateField(id: string, input: FieldInput): Promise<CustomField> {
  const cur = await pool.query<FieldRow>('SELECT * FROM custom_fields WHERE id = $1', [id]);
  if (!cur.rowCount) throw new NotFoundError('Custom field not found');
  const c = cur.rows[0];
  // Key and type are fixed once created: stored values depend on them.
  const label = input.label !== undefined ? String(input.label).trim() : c.label;
  if (!label) throw new ValidationError('Label is required');
  const { rows } = await pool.query<FieldRow>(
    `UPDATE custom_fields SET label=$2, options=$3::jsonb, entity_types=$4, required=$5, help_text=$6, active=$7, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [id, label,
      JSON.stringify(input.options !== undefined ? cleanOptions(c.field_type, input.options) : c.options),
      input.entityTypes !== undefined ? cleanEntityTypes(input.entityTypes) : c.entity_types,
      input.required !== undefined ? Boolean(input.required) : c.required,
      input.helpText !== undefined ? (input.helpText ? String(input.helpText).slice(0, 200) : null) : c.help_text,
      input.active !== undefined ? Boolean(input.active) : c.active]);
  return toField(rows[0]);
}

export interface FieldWithValue extends CustomField {
  value: unknown;
  /** Where the value is stored. 'seed_lot' means shared across every module showing that lot. */
  storedOn: { entityType: string; entityId: string };
  shared: boolean;
}

/** A field that applies to seed_lot is stored on the lot so all modules share it. */
function resolveTarget(f: CustomField, entityType: string, entityId: string, lotId?: string) {
  if (lotId && f.entityTypes.includes('seed_lot')) return { entityType: 'seed_lot', entityId: lotId, shared: true };
  if (f.entityTypes.includes(entityType)) return { entityType, entityId, shared: false };
  return null;
}

export async function getValues(entityType: string, entityId: string, lotId?: string): Promise<FieldWithValue[]> {
  const fields = (await listFields({})).filter((f) =>
    f.entityTypes.includes(entityType) || (lotId && f.entityTypes.includes('seed_lot')));
  const resolved = fields.flatMap((f) => {
    const t = resolveTarget(f, entityType, entityId, lotId);
    return t ? [{ f, t }] : [];
  });
  if (!resolved.length) return [];
  const { rows } = await pool.query<{ field_id: string; entity_type: string; entity_id: string; value: unknown }>(
    `SELECT field_id, entity_type, entity_id, value FROM custom_field_values
     WHERE (entity_type = $1 AND entity_id = $2) OR (entity_type = 'seed_lot' AND entity_id = $3)`,
    [entityType, entityId, lotId ?? '']);
  return resolved.map(({ f, t }) => {
    const v = rows.find((r) => r.field_id === f.id && r.entity_type === t.entityType && r.entity_id === t.entityId);
    return { ...f, value: v ? v.value : null, storedOn: { entityType: t.entityType, entityId: t.entityId }, shared: t.shared };
  });
}

function coerce(f: CustomField, raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === '') {
    if (f.required) throw new ValidationError(`${f.label} is required`);
    return null;
  }
  switch (f.fieldType) {
    case 'number': {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new ValidationError(`${f.label} must be a number`);
      return n;
    }
    case 'boolean': return raw === true || raw === 'true';
    case 'date': {
      const s = String(raw);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new ValidationError(`${f.label} must be a valid date`);
      return s;
    }
    case 'select':
      if (!f.options.includes(String(raw))) throw new ValidationError(`${f.label}: choose one of the listed options`);
      return String(raw);
    default: return String(raw).slice(0, 2000);
  }
}

export async function saveValues(
  entityType: string, entityId: string, lotId: string | undefined,
  values: Record<string, unknown>, user: AuthenticatedUser,
): Promise<FieldWithValue[]> {
  if (!ENTITY_TYPES.includes(entityType as never)) throw new ValidationError('Unknown record type');
  if (!entityId) throw new ValidationError('Record id is required');
  const fields = await listFields({});
  const applicable = fields.filter((f) => resolveTarget(f, entityType, entityId, lotId));
  // Validate everything first so a bad value saves nothing.
  const writes = applicable.filter((f) => f.fieldKey in values).map((f) => ({
    f, t: resolveTarget(f, entityType, entityId, lotId)!, v: coerce(f, values[f.fieldKey]),
  }));
  for (const f of applicable) if (f.required && !(f.fieldKey in values)) {
    const cur = (await getValues(entityType, entityId, lotId)).find((x) => x.id === f.id);
    if (cur?.value === null || cur?.value === undefined) throw new ValidationError(`${f.label} is required`);
  }
  for (const w of writes) {
    await pool.query(
      `INSERT INTO custom_field_values (field_id, entity_type, entity_id, value, updated_by)
       VALUES ($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT (field_id, entity_type, entity_id) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [w.f.id, w.t.entityType, w.t.entityId, JSON.stringify(w.v), user.email]);
  }
  return getValues(entityType, entityId, lotId);
}
