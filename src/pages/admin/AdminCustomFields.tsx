import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { adminNav } from '@/config/adminNav';
import { useToast } from '@/components/common/Toast/ToastContext';
import { ENTITY_OPTIONS, FIELD_TYPE_LABELS } from '@/components/customFields/entityTypes';
import {
  createCustomField, fetchCustomFields, updateCustomField,
  type CustomEntityType, type CustomField, type CustomFieldType,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

interface Form {
  id: string | null; label: string; fieldType: CustomFieldType; optionsText: string;
  entityTypes: CustomEntityType[]; required: boolean; helpText: string;
}
const EMPTY: Form = { id: null, label: '', fieldType: 'text', optionsText: '', entityTypes: ['seed_lot'], required: false, helpText: '' };

const placeLabel = (t: string) => ENTITY_OPTIONS.find((o) => o.value === t);

/**
 * Admin-defined attributes. Define a field once, tick every record type it
 * belongs on, and it appears and saves in each of those modules. Ticking
 * "Seed lot" stores the value on the lot itself, so Lab, Quality, Warehouse
 * and Processing all read and write the same value.
 */
export default function AdminCustomFields() {
  const { token, canAdminister, loading } = useAdminSession();
  const { addToast } = useToast();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (t: string) => {
    try { setFields(await fetchCustomFields(t, true)); } catch { setFields([]); }
  }, []);
  useEffect(() => { if (token) void load(token); }, [token, load]);

  const toggleType = (t: CustomEntityType) =>
    setForm((f) => ({ ...f, entityTypes: f.entityTypes.includes(t) ? f.entityTypes.filter((x) => x !== t) : [...f.entityTypes, t] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const options = form.optionsText.split(',').map((o) => o.trim()).filter(Boolean);
    if (!form.label.trim()) return addToast('Give the field a name.', 'error');
    if (!form.entityTypes.length) return addToast('Choose where the field should appear.', 'error');
    if (form.fieldType === 'select' && options.length < 2) return addToast('A dropdown needs at least two options.', 'error');
    setBusy(true);
    try {
      const base = { label: form.label.trim(), entityTypes: form.entityTypes, required: form.required, helpText: form.helpText, options };
      if (form.id) await updateCustomField(token, form.id, base);
      else await createCustomField(token, { ...base, fieldType: form.fieldType });
      addToast(form.id ? 'Field updated.' : 'Field created. It now appears on the selected pages.', 'success');
      setForm(EMPTY);
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Could not save the field.', 'error');
    } finally { setBusy(false); }
  }

  async function toggleActive(f: CustomField) {
    if (!token) return;
    try { await updateCustomField(token, f.id, { active: !f.active }); await load(token); }
    catch (err) { addToast(err instanceof Error ? err.message : 'Could not update.', 'error'); }
  }

  const edit = (f: CustomField) => setForm({
    id: f.id, label: f.label, fieldType: f.fieldType, optionsText: f.options.join(', '),
    entityTypes: f.entityTypes, required: f.required, helpText: f.helpText ?? '',
  });

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Custom fields</h1>
            <p className={styles.subtitle}>Create an attribute once and it shows up, and can be filled in, on every record type you choose across the modules.</p>
          </div>
        </div>

        {!loading && !canAdminister && <div className={styles.readOnlyNotice}>Only administrators can create or change custom fields.</div>}

        <form className={styles.card} onSubmit={submit}>
          <h2 className={styles.sectionTitle ?? ''}>{form.id ? 'Edit field' : 'New field'}</h2>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Field name</label>
              <input className={styles.textInput} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Target moisture %" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Type {form.id && '(fixed)'}</label>
              <select className={styles.select} value={form.fieldType} disabled={Boolean(form.id)} onChange={(e) => setForm({ ...form, fieldType: e.target.value as CustomFieldType })}>
                {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.fieldType === 'select' && (
              <div className={styles.field}>
                <label className={styles.label}>Options (comma separated)</label>
                <input className={styles.textInput} value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} placeholder="Retail, Export, Government" />
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Help text (optional)</label>
              <input className={styles.textInput} value={form.helpText} onChange={(e) => setForm({ ...form, helpText: e.target.value })} />
            </div>
          </div>

          <label className={styles.label}>Show this field on</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 8, marginBottom: 14 }}>
            {ENTITY_OPTIONS.map((o) => (
              <label key={o.value} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input type="checkbox" checked={form.entityTypes.includes(o.value)} onChange={() => toggleType(o.value)} />
                <span><b>{o.module}</b> · {o.label}</span>
              </label>
            ))}
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 14 }}>
            <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} /> Required
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit" disabled={busy || !canAdminister}>{form.id ? 'Save changes' : 'Create field'}</Button>
            {form.id && <Button type="button" variant="secondary" onClick={() => setForm(EMPTY)}>Cancel</Button>}
          </div>
        </form>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle ?? ''}>Existing fields</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Field</th><th>Type</th><th>Appears on</th><th>Status</th><th /></tr></thead>
              <tbody>
                {fields.length === 0 && <tr><td colSpan={5}>No custom fields yet.</td></tr>}
                {fields.map((f) => (
                  <tr key={f.id} style={f.active ? undefined : { opacity: 0.55 }}>
                    <td><b>{f.label}</b>{f.required && ' *'}<div style={{ fontSize: 12, color: '#6b7a6f' }}>{f.fieldKey}</div></td>
                    <td>{FIELD_TYPE_LABELS[f.fieldType]}{f.fieldType === 'select' && <div style={{ fontSize: 12 }}>{f.options.join(' · ')}</div>}</td>
                    <td>{f.entityTypes.map((t) => <div key={t} style={{ fontSize: 13 }}>{placeLabel(t)?.module} · {placeLabel(t)?.label.replace(' (shared across all modules)', '')}</div>)}</td>
                    <td>{f.active ? 'Active' : 'Hidden'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className={styles.rowButton} disabled={!canAdminister} onClick={() => edit(f)}>Edit</button>{' '}
                      <button className={styles.rowButton} disabled={!canAdminister} onClick={() => void toggleActive(f)}>{f.active ? 'Hide' : 'Show'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
