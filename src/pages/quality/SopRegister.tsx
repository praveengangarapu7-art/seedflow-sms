import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, FilePlus2, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import {
  QUALITY_DEPARTMENTS,
  createSop,
  fetchSops,
  qualityDepartmentLabel,
  type QualityDepartment,
  type SopListItem,
} from '@/services/seedLotRealtimeClient';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Field, Pill, StatusPill, fmtDate, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

type ReviewFilter = 'all' | 'overdue' | 'due_soon' | 'not_effective';

function reviewPill(item: SopListItem) {
  if (item.review_status === 'overdue') return <Pill tone="bad">Review overdue</Pill>;
  if (item.review_status === 'due_soon') return <Pill tone="warn">Review due soon</Pill>;
  if (item.review_status === 'not_effective') return <Pill tone="neutral">Not yet in force</Pill>;
  return <Pill tone="good">Current</Pill>;
}

export default function SopRegister() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, backendEmail, error: sessionError } = useQualitySession();
  const canAuthor = usePermission('author_sop');
  const { run, busy } = useQualityAction();

  const [department, setDepartment] = useState<string>('');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const sops = useQualityLoad<SopListItem[]>(token, (t) => fetchSops(t, { department: department || undefined }), [department]);
  const rows = Array.isArray(sops.data) ? sops.data : [];
  const visible = useMemo(() => (reviewFilter === 'all' ? rows : rows.filter((r) => r.review_status === reviewFilter)), [rows, reviewFilter]);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', department: 'production' as QualityDepartment, ownerEmail: '', reviewIntervalMonths: '12', content: '' });

  const openCreate = () => {
    setForm({ title: '', department: 'production', ownerEmail: backendEmail ?? '', reviewIntervalMonths: '12', content: '' });
    setShowCreate(true);
  };

  const submit = async () => {
    if (!token) return;
    if (!form.title.trim() || !form.ownerEmail.trim() || !form.content.trim()) {
      addToast('Title, owner and procedure text are required.', 'error');
      return;
    }
    const created = await run(
      () =>
        createSop(token, {
          title: form.title.trim(),
          department: form.department,
          ownerEmail: form.ownerEmail.trim(),
          content: form.content.trim(),
          reviewIntervalMonths: Number(form.reviewIntervalMonths) || 12,
        }),
      (r) => `${r.document.sop_code} created as a draft`,
    );
    if (created) {
      setShowCreate(false);
      navigate(`/quality/sops/${created.document.id}`);
    }
  };

  const filters: { key: ReviewFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Review overdue' },
    { key: 'due_soon', label: 'Due in 30 days' },
    { key: 'not_effective', label: 'Not in force' },
  ];

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>SOP Register</h1>
            <p className={styles.subtitle}>
              Every controlled procedure, with its version history, approver and next review date. A SOP only takes effect once someone other than
              its author approves it.
            </p>
          </div>
          <div className={styles.controls}>
            <select className={`${styles.select} ${styles.textInput}`} value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
              <option value="">All departments</option>
              {QUALITY_DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void sops.reload()}>
              Refresh
            </Button>
            {canAuthor && (
              <Button leftIcon={FilePlus2} onClick={openCreate}>
                New SOP
              </Button>
            )}
          </div>
        </div>

        <ErrorCard message={sessionError ?? sops.error} />

        <div className={styles.filterBar}>
          {filters.map((f) => (
            <button key={f.key} className={`${styles.chip} ${reviewFilter === f.key ? styles.chipActive : ''}`} onClick={() => setReviewFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.card}>
          {sops.loading ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>
              {rows.length === 0 ? 'No SOPs have been registered yet. Start with the departments that have no defined process.' : 'No SOPs match this filter.'}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>In force</th>
                    <th>Review</th>
                    <th>Next review</th>
                    <th>Read by</th>
                    <th>Revision</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <button className={styles.rowButton} onClick={() => navigate(`/quality/sops/${s.id}`)}>
                          {s.sop_code}
                        </button>
                      </td>
                      <td>{s.title}</td>
                      <td>{qualityDepartmentLabel(s.department)}</td>
                      <td>{s.effective_version ? `v${s.effective_version} · ${fmtDate(s.effective_date)}` : '—'}</td>
                      <td>{reviewPill(s)}</td>
                      <td className={s.review_status === 'overdue' ? styles.overdue : undefined}>{fmtDate(s.next_review_date)}</td>
                      <td>{s.effective_version ? s.acknowledgement_count : '—'}</td>
                      <td>{s.open_version ? <span>v{s.open_version} <StatusPill status={s.open_version_status ?? 'draft'} /></span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New SOP" size="lg">
          <div className={styles.modalStack}>
            <Field label="Title" htmlFor="sop-title">
              <input id="sop-title" className={styles.textInput} value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div className={styles.twoCol}>
              <Field label="Department" htmlFor="sop-dept">
                <select id="sop-dept" className={styles.select} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as QualityDepartment })}>
                  {QUALITY_DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Owner (email)" htmlFor="sop-owner">
                <input id="sop-owner" className={styles.textInput} type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
              </Field>
            </div>
            <Field label="Review every (months)" htmlFor="sop-interval">
              <input id="sop-interval" className={styles.textInput} type="number" min={1} max={60} value={form.reviewIntervalMonths} onChange={(e) => setForm({ ...form, reviewIntervalMonths: e.target.value })} />
            </Field>
            <div>
              <label className={styles.label} htmlFor="sop-content">
                Procedure (purpose, scope, responsibilities, steps, records)
              </label>
              <textarea id="sop-content" className={styles.textArea} style={{ minHeight: 220 }} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className={styles.actionsRow}>
              <Button isLoading={busy} onClick={() => void submit()}>
                Create draft
              </Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ModuleLayout>
  );
}
