import { useState } from 'react';
import { CustomFieldsPanel } from '@/components/customFields/CustomFieldsPanel';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, ClipboardCheck, Pencil, Plus, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import { cancelNcr, closeNcr, fetchNcrById, qualityDepartmentLabel, updateNcr, type NcrDetail as NcrDetailData } from '@/services/seedLotRealtimeClient';
import { CapaFormModal } from './CapaFormModal';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Field, Notice, PromptModal, SeverityBadge, StatusPill, fmtDate, humanize, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
type Dialog = null | 'update' | 'capa' | 'close' | 'cancel';

export default function NcrDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { token, backendEmail, error: sessionError } = useQualitySession();
  const { run, busy } = useQualityAction();
  const canManage = usePermission('manage_ncr');
  const canCapa = usePermission('manage_capa');
  const canClose = usePermission('close_ncr');
  const canCancel = usePermission('cancel_quality_records');

  const detail = useQualityLoad<NcrDetailData>(token, (t) => fetchNcrById(t, id), [id]);
  const ncr = detail.data && !Array.isArray(detail.data) ? detail.data : null;

  const [dialog, setDialog] = useState<Dialog>(null);
  const [updateForm, setUpdateForm] = useState({ assignedTo: '', dueDate: '', rootCause: '' });
  const [closeForm, setCloseForm] = useState({ rootCause: '', closureNotes: '' });

  const finished = ncr ? ncr.status === 'closed' || ncr.status === 'cancelled' : false;
  const activeCapas = ncr?.capas.filter((c) => c.status !== 'cancelled') ?? [];
  const unfinishedCapas = activeCapas.filter((c) => c.status !== 'closed');

  // Mirror of the server's closure rules, so the button explains itself
  // instead of failing. The server remains the authority.
  const closeBlockers: string[] = [];
  if (ncr) {
    if (!ncr.root_cause) closeBlockers.push('record a root cause');
    if (unfinishedCapas.length > 0) closeBlockers.push(`finish ${unfinishedCapas.length} open action(s): ${unfinishedCapas.map((c) => c.capa_code).join(', ')}`);
    if (ncr.severity !== 'minor' && activeCapas.length === 0) closeBlockers.push('raise at least one corrective or preventive action');
  }

  const act = async <T,>(fn: () => Promise<T>, message: string) => {
    const done = await run(fn, message);
    if (done) await detail.reload();
    return done;
  };

  const openUpdate = () => {
    if (!ncr) return;
    setUpdateForm({ assignedTo: ncr.assigned_to ?? '', dueDate: ncr.due_date?.slice(0, 10) ?? '', rootCause: ncr.root_cause ?? '' });
    setDialog('update');
  };

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/quality/ncrs')}>
          ← Back to non-conformances
        </button>
        <ErrorCard message={sessionError ?? detail.error} />
        {ncr && <CustomFieldsPanel entityType="non_conformance" entityId={ncr.id} lotId={ncr.lot_code ?? undefined} />}
        {detail.loading && !ncr && <div className={styles.card}>Loading…</div>}

        {ncr && (
          <>
            <div className={styles.header}>
              <div>
                <h1 className={styles.title}>
                  {ncr.ncr_code} — {ncr.title}
                </h1>
                <p className={styles.subtitle}>
                  <SeverityBadge severity={ncr.severity} /> <StatusPill status={ncr.status} /> · {qualityDepartmentLabel(ncr.department)} · found via {humanize(ncr.source)}
                </p>
              </div>
              <div className={styles.controls}>
                <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void detail.reload()}>
                  Refresh
                </Button>
              </div>
            </div>

            <RecordAiPanel recordType="quality.ncr" record={ncr} label={ncr.ncr_code} />
            {ncr.is_overdue && <Notice tone="bad">This non-conformance was due on {fmtDate(ncr.due_date)} and is still open.</Notice>}
            {ncr.holds.some((h) => !h.released_at) && (
              <Notice tone="warn">
                Seed lot {ncr.lot_code} is on quality hold because of this non-conformance. The hold cannot be released until this NCR is closed.
              </Notice>
            )}

            {!finished && (
              <div className={styles.card}>
                <div className={styles.actionsRow}>
                  {canManage && (
                    <Button variant="secondary" leftIcon={Pencil} onClick={openUpdate}>
                      Assign / record root cause
                    </Button>
                  )}
                  {canCapa && (
                    <Button variant="secondary" leftIcon={Plus} onClick={() => setDialog('capa')}>
                      Add corrective / preventive action
                    </Button>
                  )}
                  {canClose && (
                    <Button
                      leftIcon={CheckCircle2}
                      disabled={closeBlockers.length > 0}
                      onClick={() => {
                        setCloseForm({ rootCause: ncr.root_cause ?? '', closureNotes: '' });
                        setDialog('close');
                      }}
                    >
                      Close NCR
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="danger" leftIcon={Ban} onClick={() => setDialog('cancel')}>
                      Cancel NCR
                    </Button>
                  )}
                </div>
                {canClose && closeBlockers.length > 0 && <p className={styles.sectionSubtitle} style={{ marginTop: '0.75rem', marginBottom: 0 }}>To close this NCR you must: {closeBlockers.join('; ')}.</p>}
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Raised by</span>
                  {ncr.raised_by}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Assigned to</span>
                  {ncr.assigned_to ?? 'Unassigned'}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Due</span>
                  <span className={ncr.is_overdue ? styles.overdue : undefined}>{fmtDate(ncr.due_date)}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Seed lot</span>
                  {ncr.lot_code ?? '—'}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Raised</span>
                  {fmtDate(ncr.created_at)}
                </div>
                {ncr.closed_at && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Closed</span>
                    {fmtDate(ncr.closed_at)} by {ncr.closed_by}
                  </div>
                )}
              </div>
              <h2 className={styles.sectionTitle}>Description</h2>
              <div className={styles.proseBlock}>{ncr.description}</div>
              <h2 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
                Root cause
              </h2>
              <div className={styles.proseBlock}>{ncr.root_cause ?? 'Not yet recorded.'}</div>
              {ncr.closure_notes && (
                <>
                  <h2 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
                    {ncr.status === 'cancelled' ? 'Cancellation reason' : 'Closure notes'}
                  </h2>
                  <div className={styles.proseBlock}>{ncr.closure_notes}</div>
                </>
              )}
              {ncr.complaint && (
                <p style={{ marginTop: '1rem' }}>
                  Raised from complaint{' '}
                  <button className={styles.rowButton} onClick={() => navigate(`/quality/complaints/${ncr.complaint!.id}`)}>
                    {ncr.complaint.complaint_code}
                  </button>
                </p>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Corrective and preventive actions</h2>
              {ncr.capas.length === 0 ? (
                <div className={styles.emptyState}>No actions raised yet.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Type</th>
                        <th>Owner</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th>Effectiveness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ncr.capas.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <button className={styles.rowButton} onClick={() => navigate('/quality/capas')}>
                              {c.capa_code}
                            </button>{' '}
                            {c.title}
                          </td>
                          <td>{humanize(c.action_type)}</td>
                          <td>{c.owner_email}</td>
                          <td className={c.is_overdue ? styles.overdue : undefined}>{fmtDate(c.due_date)}</td>
                          <td>
                            <StatusPill status={c.status} />
                          </td>
                          <td>{c.effectiveness_result ? `${humanize(c.effectiveness_result)} (${c.verified_by})` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <Modal isOpen={dialog === 'update'} onClose={() => setDialog(null)} title="Assign and investigate">
          <div className={styles.modalStack}>
            <Field label="Assigned to (email)" htmlFor="upd-assign">
              <input id="upd-assign" className={styles.textInput} type="email" value={updateForm.assignedTo} onChange={(e) => setUpdateForm({ ...updateForm, assignedTo: e.target.value })} />
            </Field>
            <Field label="Due date" htmlFor="upd-due">
              <input id="upd-due" className={styles.textInput} type="date" value={updateForm.dueDate} onChange={(e) => setUpdateForm({ ...updateForm, dueDate: e.target.value })} />
            </Field>
            <div>
              <label className={styles.label} htmlFor="upd-root">
                Root cause
              </label>
              <textarea id="upd-root" className={styles.textArea} value={updateForm.rootCause} onChange={(e) => setUpdateForm({ ...updateForm, rootCause: e.target.value })} placeholder="Why did this happen? Recording it moves the NCR into investigation." />
            </div>
            <div className={styles.actionsRow}>
              <Button
                isLoading={busy}
                onClick={async () => {
                  if (!token) return;
                  const done = await act(
                    () =>
                      updateNcr(token, id, {
                        assignedTo: updateForm.assignedTo.trim() || null,
                        dueDate: updateForm.dueDate || null,
                        rootCause: updateForm.rootCause.trim() || null,
                        startInvestigation: true,
                      }),
                    'Non-conformance updated',
                  );
                  if (done) setDialog(null);
                }}
              >
                Save
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <CapaFormModal isOpen={dialog === 'capa'} token={token} defaultOwner={backendEmail} ncrId={id} onClose={() => setDialog(null)} onCreated={() => void detail.reload()} />

        <Modal isOpen={dialog === 'close'} onClose={() => setDialog(null)} title="Close non-conformance">
          <div className={styles.modalStack}>
            {!ncr?.root_cause && (
              <div>
                <label className={styles.label} htmlFor="close-root">
                  Root cause
                </label>
                <textarea id="close-root" className={styles.textArea} value={closeForm.rootCause} onChange={(e) => setCloseForm({ ...closeForm, rootCause: e.target.value })} />
              </div>
            )}
            <div>
              <label className={styles.label} htmlFor="close-notes">
                Closure notes — what was done and how you know it worked
              </label>
              <textarea id="close-notes" className={styles.textArea} value={closeForm.closureNotes} onChange={(e) => setCloseForm({ ...closeForm, closureNotes: e.target.value })} />
            </div>
            <div className={styles.actionsRow}>
              <Button
                isLoading={busy}
                onClick={async () => {
                  if (!token || !closeForm.closureNotes.trim()) return;
                  const done = await act(
                    () => closeNcr(token, id, { closureNotes: closeForm.closureNotes.trim(), rootCause: closeForm.rootCause.trim() || undefined }),
                    'Non-conformance closed',
                  );
                  if (done) setDialog(null);
                }}
              >
                Close NCR
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <PromptModal
          isOpen={dialog === 'cancel'}
          title="Cancel non-conformance"
          label="Reason for cancelling"
          placeholder="e.g. Raised in error / duplicate of NCR-…"
          confirmLabel="Cancel NCR"
          confirmVariant="danger"
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            if (token && (await act(() => cancelNcr(token, id, reason), 'Non-conformance cancelled'))) setDialog(null);
          }}
        />
      </div>
    </ModuleLayout>
  );
}
