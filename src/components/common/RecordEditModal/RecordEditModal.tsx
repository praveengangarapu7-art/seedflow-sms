import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import styles from './RecordEditModal.module.css';

export interface EditField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'email';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface Props {
  isOpen: boolean;
  title: string;
  fields: EditField[];
  values: object;
  submitLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string | number>) => void;
}

/** A small form modal used across modules for edit, reason and quick-create dialogs. */
export function RecordEditModal({ isOpen, title, fields, values, submitLabel = 'Save', danger, onClose, onSave }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      const v = (values as Record<string, unknown>)[f.key];
      next[f.key] = v === undefined || v === null ? '' : String(v);
    });
    setForm(next);
    // Reset only when the dialog opens.
  }, [isOpen]);

  const missing = fields.some((f) => f.required && !form[f.key]?.trim());

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (missing) return;
    const out: Record<string, string | number> = {};
    fields.forEach((f) => {
      const raw = form[f.key] ?? '';
      out[f.key] = f.type === 'number' && raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : raw.trim();
    });
    onSave(out);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" disabled={missing} onClick={() => submit()}>{submitLabel}</Button>
        </div>
      }
    >
      <form className={styles.form} onSubmit={submit}>
        {fields.map((f) => (
          <label key={f.key} className={styles.field}>
            <span className={styles.label}>{f.label}{f.required ? ' *' : ''}</span>
            {f.type === 'textarea' ? (
              <textarea className={styles.input} rows={3} value={form[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            ) : f.type === 'select' ? (
              <select className={styles.input} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                <option value="">Select…</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input className={styles.input} type={f.type ?? 'text'} value={form[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
          </label>
        ))}
        <button type="submit" hidden aria-hidden="true" />
      </form>
    </Modal>
  );
}

export default RecordEditModal;
