import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, MessageSquarePlus, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import { fetchComplaints, fetchSeedLots, logComplaint, type ComplaintItem, type LogComplaintPayload, type QualitySeverity, type RealtimeSeedLot } from '@/services/seedLotRealtimeClient';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Field, Notice, Pill, SeverityBadge, StatusPill, fmtDate, humanize, todayIso, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

type View = 'open' | 'resolved' | 'all';

const SOURCES: LogComplaintPayload['source'][] = ['farmer', 'dealer', 'distributor', 'internal', 'other'];

export default function Complaints() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, error: sessionError } = useQualitySession();
  const canLog = usePermission('log_complaint');
  const { run, busy } = useQualityAction();

  const [view, setView] = useState<View>('open');
  const [severity, setSeverity] = useState('');
  const complaints = useQualityLoad<ComplaintItem[]>(token, (t) => fetchComplaints(t, { severity: severity || undefined }), [severity]);
  const rows = Array.isArray(complaints.data) ? complaints.data : [];
  const isOpen = (c: ComplaintItem) => c.status === 'received' || c.status === 'investigating';
  const visible = useMemo(() => rows.filter((c) => (view === 'all' ? true : view === 'open' ? isOpen(c) : !isOpen(c))), [rows, view]);

  const lots = useQualityLoad<RealtimeSeedLot[]>(token, fetchSeedLots);
  const lotList = Array.isArray(lots.data) ? lots.data : [];

  const blank = { source: 'farmer' as LogComplaintPayload['source'], complainantName: '', complainantContact: '', seedLotId: '', title: '', description: '', severity: 'major' as QualitySeverity, receivedDate: todayIso() };
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState(blank);

  const submit = async () => {
    if (!token) return;
    if (!form.complainantName.trim() || !form.title.trim() || !form.description.trim()) {
      addToast('Complainant, a title and a description are required.', 'error');
      return;
    }
    const created = await run(
      () =>
        logComplaint(token, {
          source: form.source,
          complainantName: form.complainantName.trim(),
          complainantContact: form.complainantContact.trim() || undefined,
          seedLotId: form.seedLotId || undefined,
          title: form.title.trim(),
          description: form.description.trim(),
          severity: form.severity,
          receivedDate: form.receivedDate || undefined,
        }),
      (r) => `${r.complaint.complaint_code} logged${r.ncr ? ` — ${r.ncr.ncr_code} raised${r.hold ? ', seed lot placed on quality hold' : ''}` : ''}`,
    );
    if (created) {
      setShowLog(false);
      setForm(blank);
      const id = created.complaint?.id;
      if (id && !String(id).startsWith('demo-')) navigate(`/quality/complaints/${id}`);
      else void complaints.reload();
    }
  };

  const views: { key: View; label: string; count: number }[] = [
    { key: 'open', label: 'Open', count: rows.filter(isOpen).length },
    { key: 'resolved', label: 'Resolved / closed', count: rows.filter((c) => !isOpen(c)).length },
    { key: 'all', label: 'All', count: rows.length },
  ];

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Complaints</h1>
            <p className={styles.subtitle}>
              Farmer, dealer and distributor complaints, tied to the seed lot involved. Major and critical complaints raise a non-conformance automatically,
              so they follow the same investigation and corrective-action path as any other quality failure.
            </p>
          </div>
          <div className={styles.controls}>
            <select className={`${styles.select} ${styles.textInput}`} value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void complaints.reload()}>
              Refresh
            </Button>
            {canLog && (
              <Button leftIcon={MessageSquarePlus} onClick={() => setShowLog(true)}>
                Log complaint
              </Button>
            )}
          </div>
        </div>

        <ErrorCard message={sessionError ?? complaints.error} />

        <div className={styles.filterBar}>
          {views.map((v) => (
            <button key={v.key} className={`${styles.chip} ${view === v.key ? styles.chipActive : ''}`} onClick={() => setView(v.key)}>
              {v.label} ({v.count})
            </button>
          ))}
        </div>

        <div className={styles.card}>
          {complaints.loading ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>{view === 'open' ? 'No open complaints.' : 'Nothing to show for this filter.'}</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>From</th>
                    <th>Lot</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Age</th>
                    <th>NCR</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <button className={styles.rowButton} onClick={() => navigate(`/quality/complaints/${c.id}`)}>
                          {c.complaint_code}
                        </button>{' '}
                        {c.title}
                        {c.recall_recommended && (
                          <>
                            {' '}
                            <Pill tone="bad">Recall recommended</Pill>
                          </>
                        )}
                      </td>
                      <td>
                        {c.complainant_name}
                        <div className={styles.muted}>{humanize(c.source)}</div>
                      </td>
                      <td>{c.lot_code ?? '—'}</td>
                      <td>
                        <SeverityBadge severity={c.severity} />
                      </td>
                      <td>
                        <StatusPill status={c.status} />
                      </td>
                      <td>{fmtDate(c.received_date)}</td>
                      <td>{c.age_days}d</td>
                      <td>{c.ncr_code ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal isOpen={showLog} onClose={() => setShowLog(false)} title="Log a complaint" size="lg">
          <div className={styles.modalStack}>
            <div className={styles.twoCol}>
              <Field label="Complaint from" htmlFor="cmp-source">
                <select id="cmp-source" className={styles.select} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LogComplaintPayload['source'] })}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Received on" htmlFor="cmp-date">
                <input id="cmp-date" className={styles.textInput} type="date" max={todayIso()} value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} />
              </Field>
              <Field label="Complainant name" htmlFor="cmp-name">
                <input id="cmp-name" className={styles.textInput} value={form.complainantName} onChange={(e) => setForm({ ...form, complainantName: e.target.value })} />
              </Field>
              <Field label="Contact (phone / email)" htmlFor="cmp-contact">
                <input id="cmp-contact" className={styles.textInput} value={form.complainantContact} onChange={(e) => setForm({ ...form, complainantContact: e.target.value })} />
              </Field>
              <Field label="Seed lot (if known)" htmlFor="cmp-lot">
                <select id="cmp-lot" className={styles.select} value={form.seedLotId} onChange={(e) => setForm({ ...form, seedLotId: e.target.value })}>
                  <option value="">Lot not known yet</option>
                  {lotList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lot_code} — {l.crop} / {l.variety}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Severity" htmlFor="cmp-sev">
                <select id="cmp-sev" className={styles.select} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as QualitySeverity })}>
                  <option value="minor">Minor — cosmetic / handling</option>
                  <option value="major">Major — performance or purity concern</option>
                  <option value="critical">Critical — widespread failure or safety issue</option>
                </select>
              </Field>
            </div>
            <Field label="Title" htmlFor="cmp-title">
              <input id="cmp-title" className={styles.textInput} value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div>
              <label className={styles.label} htmlFor="cmp-desc">
                What the complainant reported
              </label>
              <textarea id="cmp-desc" className={styles.textArea} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {form.severity !== 'minor' && (
              <Notice tone="warn">
                {form.severity === 'critical' && form.seedLotId
                  ? 'This will raise a critical non-conformance and place the seed lot on quality hold immediately.'
                  : 'This will automatically raise a linked non-conformance.'}
              </Notice>
            )}
            <div className={styles.actionsRow}>
              <Button isLoading={busy} onClick={() => void submit()}>
                Log complaint
              </Button>
              <Button variant="secondary" onClick={() => setShowLog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ModuleLayout>
  );
}
