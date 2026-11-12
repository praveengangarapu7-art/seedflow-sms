import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Lock, Plus, RefreshCw, Search } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import { closeComplaint, fetchComplaintById, investigateComplaint, resolveComplaint, type ComplaintDetail as ComplaintDetailData } from '@/services/seedLotRealtimeClient';
import { CapaFormModal } from './CapaFormModal';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Notice, Pill, SeverityBadge, StatusPill, fmtDate, humanize, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
type Dialog = null | 'resolve' | 'capa';

export default function ComplaintDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, backendEmail, error: sessionError } = useQualitySession();
  const { run, busy } = useQualityAction();
  const canManage = usePermission('manage_complaint');
  const canCapa = usePermission('manage_capa');
  const canClose = usePermission('close_complaint');
  const canSeeHolds = usePermission('view_lot_holds');

  const detail = useQualityLoad<ComplaintDetailData>(token, (t) => fetchComplaintById(t, id), [id]);
  const c = detail.data && !Array.isArray(detail.data) ? detail.data : null;

  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState({ rootCause: '', resolution: '', recall: false });

  const act = async <T,>(fn: () => Promise<T>, message: string) => {
    const done = await run(fn, message);
    if (done) await detail.reload();
    return done;
  };

  const ncrOpen = c?.ncr ? c.ncr.status !== 'closed' && c.ncr.status !== 'cancelled' : false;
  const openCapas = c?.capas.filter((x) => x.status === 'open' || x.status === 'in_progress' || x.status === 'implemented') ?? [];

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/quality/complaints')}>
          ← Back to complaints
        </button>
        <ErrorCard message={sessionError ?? detail.error} />
        {detail.loading && !c && <div className={styles.card}>Loading…</div>}

        {c && (
          <>
            <div className={styles.header}>
              <div>
                <h1 className={styles.title}>
                  {c.complaint_code} — {c.title}
                </h1>
                <p className={styles.subtitle}>
                  <SeverityBadge severity={c.severity} /> <StatusPill status={c.status} /> · from {c.complainant_name} ({humanize(c.source)}) · received {fmtDate(c.received_date)}
                </p>
              </div>
              <div className={styles.controls}>
                <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void detail.reload()}>
                  Refresh
                </Button>
              </div>
            </div>

            <RecordAiPanel recordType="quality.complaint" record={c} label={c.complaint_code} />
            {c.recall_recommended && c.status !== 'closed' && (
              <Notice tone="bad">
                A recall has been recommended for lot {c.lot_code ?? '(lot not identified)'}.{' '}
                {c.seed_lot_id && canSeeHolds && (
                  <button className={styles.rowButton} onClick={() => navigate(`/quality/holds?lot=${c.seed_lot_id}`)}>
                    See who received this lot →
                  </button>
                )}
              </Notice>
            )}

            <div className={styles.card}>
              <div className={styles.actionsRow}>
                {canManage && c.status === 'received' && (
                  <Button leftIcon={Search} isLoading={busy} onClick={() => token && void act(() => investigateComplaint(token, id), 'Complaint under investigation')}>
                    Start investigation
                  </Button>
                )}
                {canManage && (c.status === 'received' || c.status === 'investigating') && (
                  <Button
                    variant="secondary"
                    leftIcon={CheckCircle2}
                    onClick={() => {
                      setForm({ rootCause: '', resolution: '', recall: c.recall_recommended });
                      setDialog('resolve');
                    }}
                  >
                    Resolve
                  </Button>
                )}
                {canCapa && c.status !== 'closed' && (
                  <Button variant="secondary" leftIcon={Plus} onClick={() => setDialog('capa')}>
                    Add corrective action
                  </Button>
                )}
                {canClose && c.status === 'resolved' && (
                  <Button leftIcon={CheckCircle2} isLoading={busy} disabled={ncrOpen || openCapas.length > 0} onClick={() => token && void act(() => closeComplaint(token, id), 'Complaint closed')}>
                    Close complaint
                  </Button>
                )}
                {c.seed_lot_id && canSeeHolds && (
                  <Button variant="ghost" leftIcon={Lock} onClick={() => navigate(`/quality/holds?lot=${c.seed_lot_id}`)}>
                    Lot impact
                  </Button>
                )}
              </div>
              {canClose && c.status === 'resolved' && (ncrOpen || openCapas.length > 0) && (
                <p className={styles.sectionSubtitle} style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                  To close: {ncrOpen ? `close ${c.ncr!.ncr_code}` : ''}
                  {ncrOpen && openCapas.length > 0 ? '; ' : ''}
                  {openCapas.length > 0 ? `finish ${openCapas.map((x) => x.capa_code).join(', ')}` : ''}.
                </p>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Seed lot</span>
                  {c.lot_code ? `${c.lot_code} (${c.crop} / ${c.variety})` : 'Not identified'}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Contact</span>
                  {c.complainant_contact ?? '—'}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Assigned to</span>
                  {c.assigned_to ?? 'Unassigned'}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Linked NCR</span>
                  {c.ncr ? (
                    <button className={styles.rowButton} onClick={() => navigate(`/quality/ncrs/${c.ncr!.id}`)}>
                      {c.ncr.ncr_code} <Pill tone={ncrOpen ? 'warn' : 'good'}>{humanize(c.ncr.status)}</Pill>
                    </button>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <h2 className={styles.sectionTitle}>Complaint</h2>
              <div className={styles.proseBlock}>{c.description}</div>
              {c.root_cause && (
                <>
                  <h2 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
                    Root cause
                  </h2>
                  <div className={styles.proseBlock}>{c.root_cause}</div>
                </>
              )}
              {c.resolution && (
                <>
                  <h2 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
                    Resolution
                  </h2>
                  <div className={styles.proseBlock}>{c.resolution}</div>
                </>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Corrective actions raised directly from this complaint</h2>
              {c.capas.length === 0 ? (
                <div className={styles.emptyState}>None. Actions linked to the NCR appear on that record.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Owner</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.capas.map((x) => (
                      <tr key={x.id}>
                        <td>
                          <strong>{x.capa_code}</strong> {x.title}
                        </td>
                        <td>{x.owner_email}</td>
                        <td className={x.is_overdue ? styles.overdue : undefined}>{fmtDate(x.due_date)}</td>
                        <td>
                          <StatusPill status={x.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        <Modal isOpen={dialog === 'resolve'} onClose={() => setDialog(null)} title="Resolve complaint">
          <div className={styles.modalStack}>
            <div>
              <label className={styles.label} htmlFor="res-root">
                Root cause
              </label>
              <textarea id="res-root" className={styles.textArea} value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} />
            </div>
            <div>
              <label className={styles.label} htmlFor="res-res">
                Resolution given to the complainant
              </label>
              <textarea id="res-res" className={styles.textArea} value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} />
            </div>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="checkbox" checked={form.recall} onChange={(e) => setForm({ ...form, recall: e.target.checked })} /> Recommend recall / withdrawal of this lot
            </label>
            <div className={styles.actionsRow}>
              <Button
                isLoading={busy}
                onClick={async () => {
                  if (!token) return;
                  if (!form.rootCause.trim() || !form.resolution.trim()) {
                    addToast('Both a root cause and a resolution are required.', 'error');
                    return;
                  }
                  const done = await act(() => resolveComplaint(token, id, { rootCause: form.rootCause.trim(), resolution: form.resolution.trim(), recallRecommended: form.recall }), 'Complaint resolved');
                  if (done) setDialog(null);
                }}
              >
                Resolve
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <CapaFormModal isOpen={dialog === 'capa'} token={token} defaultOwner={backendEmail} complaintId={id} ncrId={c?.ncr_id ?? undefined} onClose={() => setDialog(null)} onCreated={() => void detail.reload()} />
      </div>
    </ModuleLayout>
  );
}
