import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Save, SlidersHorizontal } from 'lucide-react';
import { useAdminSession } from '@/pages/admin/useAdminSession';
import {
  fetchCustomFieldValues, saveCustomFieldValues,
  type CustomFieldRef, type CustomFieldWithValue,
} from '@/services/seedLotRealtimeClient';
import styles from './CustomFieldsPanel.module.css';

type Draft = Record<string, string | boolean>;

const toDraft = (fields: CustomFieldWithValue[]): Draft =>
  Object.fromEntries(fields.map((f) => [f.fieldKey, f.fieldType === 'boolean' ? Boolean(f.value) : f.value == null ? '' : String(f.value)]));

/**
 * Shows the admin-defined custom fields that apply to this record and lets
 * the user fill them in. Pass `lotId` where the record belongs to a seed lot:
 * lot-wide fields are then stored on the lot and read back identically in
 * every module that shows it. Renders nothing when no field applies.
 */
export function CustomFieldsPanel({ entityType, entityId, lotId, title = 'Custom fields' }: CustomFieldRef & { title?: string }) {
  const { token } = useAdminSession();
  const [fields, setFields] = useState<CustomFieldWithValue[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !entityId) return;
    try {
      const f = await fetchCustomFieldValues(token, { entityType, entityId, lotId });
      setFields(f);
      setDraft(toDraft(f));
    } catch { setFields([]); }
  }, [token, entityType, entityId, lotId]);
  useEffect(() => { void load(); }, [load]);

  if (!fields.length) return null;
  const dirty = fields.some((f) => String(toDraft([f])[f.fieldKey]) !== String(draft[f.fieldKey]));

  async function save() {
    if (!token) return;
    setState('saving'); setError('');
    try {
      const values = Object.fromEntries(fields.map((f) => [f.fieldKey, f.fieldType === 'boolean' ? Boolean(draft[f.fieldKey]) : draft[f.fieldKey] === '' ? null : String(draft[f.fieldKey])]));
      const next = await saveCustomFieldValues(token, { entityType, entityId, lotId }, values);
      setFields(next); setDraft(toDraft(next)); setState('saved');
      setTimeout(() => setState('idle'), 2000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save'); setState('error'); }
  }

  return (
    <section className={styles.panel} aria-label={title}>
      <header className={styles.head}>
        <h3><SlidersHorizontal size={16} /> {title}</h3>
        <Link to="/admin/custom-fields" className={styles.manage}>Manage fields</Link>
      </header>
      <div className={styles.grid}>
        {fields.map((f) => (
          <label key={f.id} className={styles.field}>
            <span className={styles.label}>
              {f.label}{f.required && <b aria-hidden> *</b>}
              {f.shared && <span className={styles.shared} title="Stored on the lot: the same value shows in every module that displays it"><Link2 size={11} /> shared</span>}
            </span>
            {f.fieldType === 'select' ? (
              <select value={String(draft[f.fieldKey] ?? '')} onChange={(e) => setDraft({ ...draft, [f.fieldKey]: e.target.value })}>
                <option value="">Select…</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.fieldType === 'boolean' ? (
              <input type="checkbox" checked={Boolean(draft[f.fieldKey])} onChange={(e) => setDraft({ ...draft, [f.fieldKey]: e.target.checked })} />
            ) : (
              <input
                type={f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text'}
                step={f.fieldType === 'number' ? 'any' : undefined}
                value={String(draft[f.fieldKey] ?? '')}
                onChange={(e) => setDraft({ ...draft, [f.fieldKey]: e.target.value })}
              />
            )}
            {f.helpText && <span className={styles.help}>{f.helpText}</span>}
          </label>
        ))}
      </div>
      <footer className={styles.foot}>
        {state === 'error' && <span className={styles.err}>{error}</span>}
        {state === 'saved' && <span className={styles.ok}>Saved</span>}
        <button type="button" className={styles.save} disabled={!dirty || state === 'saving'} onClick={() => void save()}>
          <Save size={14} /> {state === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </footer>
    </section>
  );
}
