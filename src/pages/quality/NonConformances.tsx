import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, RefreshCw, TriangleAlert } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import {
  QUALITY_DEPARTMENTS,
  fetchNcrs,
  fetchSeedLots,
  qualityDepartmentLabel,
  raiseNcr,
  type NcrListItem,
  type QualityDepartment,
  type QualitySeverity,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Field, Notice, SeverityBadge, StatusPill, fmtDate, todayIso, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

export const NCR_SOURCE_OPTIONS = [
  { value: 'inspection', label: 'Inspection' },
  { value: 'internal_audit', label: 'Internal audit' },
  { value: 'lab_oos', label: 'Lab out-of-spec result' },
  { value: 'process_deviation', label: 'Process deviation' },
  { value: 'supplier', label: 'Supplier issue' },
  { value: 'complaint', label: 'Customer complaint' },
  { value: 'other', label: 'Other' },
];

type View = 'active' | 'overdue' | 'closed' | 'all';

export default function NonConformances() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addToast } = useToast();
  const { token, backendEmail, error: sessionError } = useQualitySession();
  const canRaise = usePermission('raise_ncr');
  const { run, busy } = useQualityAction();

  const [view, setView] = useState<View>((params.get('view') as View) || 'active');
  const [severity, setSeverity] = useState('');
  const [department, setDepartment] = useState('');

  const ncrs = useQualityLoad<NcrListItem[]>(token, (t) => fetchNcrs(t, { severity: severity || undefined, department: department || undefined }), [severity, department]);
  const rows = Array.isArray(ncrs.data) ? ncrs.data : [];
  const visible = useMemo(
    () =>
      rows.filter((n) => {
        if (view === 'active') return n.status === 'open' || n.status === 'investigating';
        if (view === 'overdue') return n.is_overdue;
        if (view === 'closed') return n.status === 'closed' || n.status === 'cancelled';
        return true;
      }),
    [rows, view],
  );

  const lots = useQualityLoad<RealtimeSeedLot[]>(token, fetchSeedLots);
  const lotList = Array.isArray(lots.data) ? lots.data : [];

  const [showRaise, setShowRaise] = useState(false);
  const blank = { title: '', description: '', department: 'production' as QualityDepartment, source: 'inspection', severity: 'major' as QualitySeverity, seedLotId: '', assignedTo: '', dueDate: '' };
  const [form, setForm] = useState(blank);

  const submit = async () => {
    if (!token) return;
    if (!form.title.trim() || !form.description.trim()) {
      addToast('A title and a description of what happened are required.', 'error');
      return;
    }
    const created = await run(
      () =>
        raiseNcr(token, {
          title: form.title.trim(),
          description: form.description.trim(),
          department: form.department,
          source: form.source,
          severity: form.severity,
          seedLotId: form.seedLotId || undefined,
          assignedTo: form.assignedTo.trim() || undefined,
          dueDate: form.dueDate || undefined,
        }),
      (r) => `${r.ncr.ncr_code} raised${r.holdPlaced ? ' — seed lot placed on quality hold' : ''}`,
    );
    if (created) {
      setShowRaise(false);
      setForm(blank);
      if (created.ncr?.id && !String(created.ncr.id).startsWith('demo-')) navigate(`/quality/ncrs/${created.ncr.id}`);
      else void ncrs.reload();
    }
  };

  const views: { key: View; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: rows.filter((n) => n.status === 'open' || n.status === 'investigating').length },
    { key: 'overdue', label: 'Overdue', count: rows.filter((n) => n.is_overdue).length },
    { key: 'closed', label: 'Closed', count: rows.filter((n) => n.status === 'closed' || n.status === 'cancelled').length },
    { key: 'all', label: 'All', count: rows.length },
  ];

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Non-conformances</h1>
            <p className={styles.subtitle}>
              Anything that did not meet its requirement — a failed inspection, an out-of-spec result, a step skipped. Anyone can raise one. It closes only
              when the root cause is recorded and every corrective action has been verified effective.
            </p>
          </div>
          <div className={styles.controls}>
            <select className={`${styles.select} ${styles.textInput}`} value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
            <select className={`${styles.select} ${styles.textInput}`} value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
              <option value="">All departments</option>
              {QUALITY_DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void ncrs.reload()}>
              Refresh
            </Button>
            {canRaise && (
              <Button leftIcon={TriangleAlert} onClick={() => setShowRaise(true)}>
                Raise NCR
              </Button>
            )}
          </div>
        </div>

        <ErrorCard message={sessionError ?? ncrs.error} />

        <div className={styles.filterBar}>
          {views.map((v) => (
            <button key={v.key} className={`${styles.chip} ${view === v.key ? styles.chipActive : ''}`} onClick={() => setView(v.key)}>
              {v.label} ({v.count})
            </button>
          ))}
        </div>

        <div className={styles.card}>
          {ncrs.loading ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>{view === 'active' ? 'No active non-conformances.' : 'Nothing to show for this filter.'}</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>NCR</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Department</th>
                    <th>Lot</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <button className={styles.rowButton} onClick={() => navigate(`/quality/ncrs/${n.id}`)}>
                          {n.ncr_code}
                        </button>
                      </td>
                      <td>{n.title}</td>
                      <td>
                        <SeverityBadge severity={n.severity} />
                      </td>
                      <td>{qualityDepartmentLabel(n.department)}</td>
                      <td>{n.lot_code ?? '—'}</td>
                      <td>
                        <StatusPill status={n.status} />
                      </td>
                      <td className={n.is_overdue ? styles.overdue : undefined}>
                        {fmtDate(n.due_date)}
                        {n.is_overdue ? ' · overdue' : ''}
                      </td>
                      <td>{n.capa_count === 0 ? '—' : `${n.capa_count - n.open_capa_count}/${n.capa_count} closed`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal isOpen={showRaise} onClose={() => setShowRaise(false)} title="Raise a non-conformance" size="lg">
          <div className={styles.modalStack}>
            <Field label="Title" htmlFor="ncr-title">
              <input id="ncr-title" className={styles.textInput} value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div>
              <label className={styles.label} htmlFor="ncr-desc">
                What happened
              </label>
              <textarea id="ncr-desc" className={styles.textArea} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className={styles.twoCol}>
              <Field label="Department" htmlFor="ncr-dept">
                <select id="ncr-dept" className={styles.select} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as QualityDepartment })}>
                  {QUALITY_DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="How it was found" htmlFor="ncr-source">
                <select id="ncr-source" className={styles.select} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  {NCR_SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Severity" htmlFor="ncr-sev">
                <select id="ncr-sev" className={styles.select} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as QualitySeverity })}>
                  <option value="minor">Minor — no product impact</option>
                  <option value="major">Major — product or process at risk</option>
                  <option value="critical">Critical — unsafe or unlawful product</option>
                </select>
              </Field>
              <Field label="Seed lot (if product is involved)" htmlFor="ncr-lot">
                <select id="ncr-lot" className={styles.select} value={form.seedLotId} onChange={(e) => setForm({ ...form, seedLotId: e.target.value })}>
                  <option value="">No specific lot</option>
                  {lotList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lot_code} — {l.crop} / {l.variety}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Assign to (email, optional)" htmlFor="ncr-assign">
                <input id="ncr-assign" className={styles.textInput} type="email" placeholder={backendEmail ?? ''} value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
              </Field>
              <Field label="Due date (default by severity)" htmlFor="ncr-due">
                <input id="ncr-due" className={styles.textInput} type="date" min={todayIso()} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </Field>
            </div>
            {form.severity === 'critical' && form.seedLotId && (
              <Notice tone="warn">
                A critical non-conformance against a lot places that lot on quality hold immediately — it cannot be allocated or packaged until the hold is
                released.
              </Notice>
            )}
            <div className={styles.actionsRow}>
              <Button isLoading={busy} onClick={() => void submit()}>
                Raise NCR
              </Button>
              <Button variant="secondary" onClick={() => setShowRaise(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ModuleLayout>
  );
}

