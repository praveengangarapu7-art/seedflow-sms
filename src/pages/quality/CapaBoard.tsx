import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import {
  cancelCapa,
  fetchCapas,
  fetchNcrs,
  implementCapa,
  startCapa,
  verifyCapa,
  type CapaItem,
  type NcrListItem,
} from '@/services/seedLotRealtimeClient';
import { CapaFormModal } from './CapaFormModal';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Notice, PromptModal, StatusPill, fmtDate, humanize, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

type View = 'active' | 'overdue' | 'verify' | 'closed' | 'all';
type Dialog = null | { kind: 'implement' | 'verify' | 'cancel' | 'new'; capa?: CapaItem };

export default function CapaBoard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, backendEmail, backendRole, error: sessionError } = useQualitySession();
  const { run, busy } = useQualityAction();
  const canManage = usePermission('manage_capa');
  const canVerify = usePermission('verify_capa');
  const canCancel = usePermission('cancel_quality_records');

  const [view, setView] = useState<View>('active');
  const capas = useQualityLoad<CapaItem[]>(token, fetchCapas);
  const rows = Array.isArray(capas.data) ? capas.data : [];
  const ncrs = useQualityLoad<NcrListItem[]>(token, (t) => fetchNcrs(t));
  const ncrOptions = (Array.isArray(ncrs.data) ? ncrs.data : [])
    .filter((n) => n.status === 'open' || n.status === 'investigating')
    .map((n) => ({ id: n.id, label: `${n.ncr_code} — ${n.title}` }));

  const isActive = (c: CapaItem) => c.status === 'open' || c.status === 'in_progress' || c.status === 'implemented';
  const visible = useMemo(
    () =>
      rows.filter((c) => {
        if (view === 'active') return isActive(c);
        if (view === 'overdue') return c.is_overdue;
        if (view === 'verify') return c.status === 'implemented';
        if (view === 'closed') return c.status === 'closed' || c.status === 'cancelled';
        return true;
      }),
    [rows, view],
  );

  const [dialog, setDialog] = useState<Dialog>(null);
  const [implNotes, setImplNotes] = useState('');
  const [verdict, setVerdict] = useState<'effective' | 'ineffective'>('effective');
  const [verifyNotes, setVerifyNotes] = useState('');

  const act = async <T,>(fn: () => Promise<T>, message: string) => {
    const done = await run(fn, message);
    if (done) await capas.reload();
    return done;
  };

  // The server lets the owner (or an Admin) work an action; mirror that so
  // buttons only appear where they will succeed.
  const canWork = (c: CapaItem) => canManage && (backendRole === 'Admin' || (backendEmail ?? '').toLowerCase() === c.owner_email);
  const canVerifyThis = (c: CapaItem) => canVerify && (backendEmail ?? '').toLowerCase() !== c.owner_email;

  const views: { key: View; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: rows.filter(isActive).length },
    { key: 'overdue', label: 'Overdue', count: rows.filter((c) => c.is_overdue).length },
    { key: 'verify', label: 'Awaiting verification', count: rows.filter((c) => c.status === 'implemented').length },
    { key: 'closed', label: 'Closed', count: rows.filter((c) => c.status === 'closed' || c.status === 'cancelled').length },
    { key: 'all', label: 'All', count: rows.length },
  ];

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Corrective &amp; Preventive Actions</h1>
            <p className={styles.subtitle}>
              An action is not finished when it is done — it is finished when someone other than its owner has checked that it worked. An action that
              fails that check goes back to the owner.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void capas.reload()}>
              Refresh
            </Button>
            {canManage && (
              <Button leftIcon={Plus} onClick={() => setDialog({ kind: 'new' })}>
                New action
              </Button>
            )}
          </div>
        </div>

        <ErrorCard message={sessionError ?? capas.error} />

        <div className={styles.filterBar}>
          {views.map((v) => (
            <button key={v.key} className={`${styles.chip} ${view === v.key ? styles.chipActive : ''}`} onClick={() => setView(v.key)}>
              {v.label} ({v.count})
            </button>
          ))}
        </div>

        <div className={styles.card}>
          {capas.loading ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>Nothing to show for this filter.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Linked to</th>
                    <th>Type</th>
                    <th>Owner</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Effectiveness</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.capa_code}</strong> {c.title}
                        {c.implementation_notes && <div className={styles.muted}>{c.implementation_notes}</div>}
                      </td>
                      <td>
                        {c.ncr_id ? (
                          <button className={styles.rowButton} onClick={() => navigate(`/quality/ncrs/${c.ncr_id}`)}>
                            {c.ncr_code}
                          </button>
                        ) : c.complaint_id ? (
                          <button className={styles.rowButton} onClick={() => navigate(`/quality/complaints/${c.complaint_id}`)}>
                            {c.complaint_code}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{humanize(c.action_type)}</td>
                      <td>{c.owner_email}</td>
                      <td className={c.is_overdue ? styles.overdue : undefined}>
                        {fmtDate(c.due_date)}
                        {c.is_overdue ? ' · overdue' : ''}
                      </td>
                      <td>
                        <StatusPill status={c.status} />
                      </td>
                      <td>
                        {c.effectiveness_result ? (
                          <>
                            {humanize(c.effectiveness_result)}
                            <div className={styles.muted}>
                              {c.verified_by}
                              {c.verification_count > 1 ? ` · attempt ${c.verification_count}` : ''}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div className={styles.actionsRow}>
                          {c.status === 'open' && canWork(c) && (
                            <Button size="sm" variant="secondary" isLoading={busy} onClick={() => token && void act(() => startCapa(token, c.id), 'Action started')}>
                              Start
                            </Button>
                          )}
                          {(c.status === 'open' || c.status === 'in_progress') && canWork(c) && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setImplNotes('');
                                setDialog({ kind: 'implement', capa: c });
                              }}
                            >
                              Mark implemented
                            </Button>
                          )}
                          {c.status === 'implemented' && canVerifyThis(c) && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setVerdict('effective');
                                setVerifyNotes('');
                                setDialog({ kind: 'verify', capa: c });
                              }}
                            >
                              Verify
                            </Button>
                          )}
                          {c.status === 'implemented' && canVerify && !canVerifyThis(c) && <span className={styles.muted}>Needs another verifier</span>}
                          {isActive(c) && canCancel && (
                            <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'cancel', capa: c })}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <CapaFormModal isOpen={dialog?.kind === 'new'} token={token} defaultOwner={backendEmail} ncrOptions={ncrOptions} onClose={() => setDialog(null)} onCreated={() => void capas.reload()} />

        <Modal isOpen={dialog?.kind === 'implement'} onClose={() => setDialog(null)} title={`Mark ${dialog?.capa?.capa_code ?? ''} implemented`}>
          <div className={styles.modalStack}>
            <div>
              <label className={styles.label} htmlFor="impl-notes">
                What was done — include evidence (document, record, photo reference)
              </label>
              <textarea id="impl-notes" className={styles.textArea} value={implNotes} onChange={(e) => setImplNotes(e.target.value)} />
            </div>
            <Notice>After this, a different person verifies whether the action actually worked.</Notice>
            <div className={styles.actionsRow}>
              <Button
                isLoading={busy}
                onClick={async () => {
                  if (!token || !dialog?.capa) return;
                  if (!implNotes.trim()) {
                    addToast('Describe what was done.', 'error');
                    return;
                  }
                  if (await act(() => implementCapa(token, dialog.capa!.id, implNotes.trim()), 'Marked implemented — awaiting verification')) setDialog(null);
                }}
              >
                Mark implemented
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={dialog?.kind === 'verify'} onClose={() => setDialog(null)} title={`Verify ${dialog?.capa?.capa_code ?? ''}`}>
          <div className={styles.modalStack}>
            {dialog?.capa?.implementation_notes && <div className={styles.proseBlock}>{dialog.capa.implementation_notes}</div>}
            <div className={styles.radioRow}>
              <label>
                <input type="radio" checked={verdict === 'effective'} onChange={() => setVerdict('effective')} /> Effective — the problem has not recurred
              </label>
              <label>
                <input type="radio" checked={verdict === 'ineffective'} onChange={() => setVerdict('ineffective')} /> Ineffective — send back to the owner
              </label>
            </div>
            <div>
              <label className={styles.label} htmlFor="verify-notes">
                Evidence for your verdict
              </label>
              <textarea id="verify-notes" className={styles.textArea} value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} placeholder="e.g. Audited the next 5 batches; no recurrence." />
            </div>
            <div className={styles.actionsRow}>
              <Button
                isLoading={busy}
                variant={verdict === 'effective' ? 'primary' : 'danger'}
                onClick={async () => {
                  if (!token || !dialog?.capa) return;
                  if (!verifyNotes.trim()) {
                    addToast('Record the evidence for your verdict.', 'error');
                    return;
                  }
                  if (await act(() => verifyCapa(token, dialog.capa!.id, verdict, verifyNotes.trim()), verdict === 'effective' ? 'Verified effective — action closed' : 'Marked ineffective — returned to owner')) setDialog(null);
                }}
              >
                {verdict === 'effective' ? 'Confirm effective' : 'Return to owner'}
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <PromptModal
          isOpen={dialog?.kind === 'cancel'}
          title={`Cancel ${dialog?.capa?.capa_code ?? ''}`}
          label="Reason for cancelling"
          confirmLabel="Cancel action"
          confirmVariant="danger"
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            if (token && dialog?.capa && (await act(() => cancelCapa(token, dialog.capa!.id, reason), 'Action cancelled'))) setDialog(null);
          }}
        />
      </div>
    </ModuleLayout>
  );
}
