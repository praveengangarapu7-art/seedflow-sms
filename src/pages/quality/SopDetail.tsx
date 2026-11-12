import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, FilePenLine, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import {
  acknowledgeSop,
  approveSop,
  fetchSopById,
  qualityDepartmentLabel,
  rejectSop,
  retireSop,
  reviseSop,
  submitSopForReview,
  updateSopDraft,
  type SopDetail as SopDetailData,
} from '@/services/seedLotRealtimeClient';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Field, Notice, PromptModal, StatusPill, fmtDate, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
type Dialog = null | 'revise' | 'edit' | 'reject' | 'retire';

export default function SopDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, backendEmail, error: sessionError } = useQualitySession();
  const { run, busy } = useQualityAction();
  const canAuthor = usePermission('author_sop');
  const canApprove = usePermission('approve_sop');
  const canAcknowledge = usePermission('acknowledge_sop');

  const detail = useQualityLoad<SopDetailData>(token, (t) => fetchSopById(t, id), [id]);
  const data = detail.data && !Array.isArray(detail.data) ? detail.data : null;

  const [dialog, setDialog] = useState<Dialog>(null);
  const [draftForm, setDraftForm] = useState({ title: '', content: '', changeSummary: '' });

  const effective = data?.versions.find((v) => v.status === 'effective') ?? null;
  const open = data?.versions.find((v) => v.status === 'draft' || v.status === 'in_review') ?? null;
  const latest = data?.versions[0] ?? null;

  const authoredByMe = Boolean(open && backendEmail && open.created_by === backendEmail);

  const openRevise = () => {
    const base = effective ?? latest;
    setDraftForm({ title: base?.title ?? '', content: base?.content ?? '', changeSummary: '' });
    setDialog('revise');
  };
  const openEdit = () => {
    if (!open) return;
    setDraftForm({ title: open.title, content: open.content, changeSummary: open.change_summary });
    setDialog('edit');
  };

  const act = async <T,>(fn: () => Promise<T>, message: string) => {
    const done = await run(fn, message);
    if (done) await detail.reload();
    return done;
  };

  const saveRevision = async () => {
    if (!token) return;
    if (!draftForm.content.trim() || !draftForm.changeSummary.trim()) {
      addToast('Procedure text and a summary of what changed are both required.', 'error');
      return;
    }
    const done =
      dialog === 'revise'
        ? await act(() => reviseSop(token, id, draftForm), 'Revision started as a draft')
        : await act(() => updateSopDraft(token, id, draftForm), 'Draft updated');
    if (done) setDialog(null);
  };

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/quality/sops')}>
          ← Back to SOP register
        </button>
        <ErrorCard message={sessionError ?? detail.error} />
        {detail.loading && !data && <div className={styles.card}>Loading…</div>}

        {data && (
          <>
            <div className={styles.header}>
              <div>
                <h1 className={styles.title}>
                  {data.document.sop_code} — {data.document.title}
                </h1>
                <p className={styles.subtitle}>
                  {qualityDepartmentLabel(data.document.department)} · owner {data.document.owner_email} · reviewed every {data.document.review_interval_months} months
                </p>
              </div>
              <div className={styles.controls}>
                <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void detail.reload()}>
                  Refresh
                </Button>
              </div>
            </div>

            <RecordAiPanel recordType="quality.sop" record={data} label={data.document.sop_code} />
            {open?.status === 'in_review' && canApprove && authoredByMe && (
              <Notice tone="warn">You authored this revision, so you cannot approve it. Another approver must sign it off.</Notice>
            )}
            {open?.status === 'rejected' && <Notice tone="bad">Latest revision was rejected.</Notice>}
            {!effective && !open && <Notice tone="warn">This SOP has no version in force.</Notice>}

            <div className={styles.card}>
              <div className={styles.actionsRow}>
                {canAcknowledge && effective && (
                  <Button
                    leftIcon={CheckCircle2}
                    variant={data.acknowledgedByMe ? 'secondary' : 'primary'}
                    disabled={data.acknowledgedByMe}
                    isLoading={busy}
                    onClick={() => token && void act(() => acknowledgeSop(token, id), 'Acknowledged')}
                  >
                    {data.acknowledgedByMe ? 'You have acknowledged this version' : 'I have read and understood this SOP'}
                  </Button>
                )}
                {canAuthor && !open && (
                  <Button variant="secondary" leftIcon={FilePenLine} onClick={openRevise}>
                    Revise
                  </Button>
                )}
                {canAuthor && open?.status === 'draft' && (
                  <>
                    <Button variant="secondary" leftIcon={FilePenLine} onClick={openEdit}>
                      Edit draft
                    </Button>
                    <Button leftIcon={Send} isLoading={busy} onClick={() => token && void act(() => submitSopForReview(token, id), 'Submitted for approval')}>
                      Submit for approval
                    </Button>
                  </>
                )}
                {canApprove && open?.status === 'in_review' && (
                  <>
                    <Button leftIcon={ShieldCheck} isLoading={busy} disabled={authoredByMe} onClick={() => token && void act(() => approveSop(token, id), 'Approved — now in force')}>
                      Approve
                    </Button>
                    <Button variant="danger" leftIcon={XCircle} onClick={() => setDialog('reject')}>
                      Reject
                    </Button>
                  </>
                )}
                {canApprove && effective && !open && (
                  <Button variant="secondary" onClick={() => setDialog('retire')}>
                    Retire
                  </Button>
                )}
              </div>
            </div>

            {effective && (
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>In force: version {effective.version_number}</h2>
                <p className={styles.sectionSubtitle}>
                  Approved by {effective.approved_by} · effective {fmtDate(effective.effective_date)} · next review {fmtDate(effective.next_review_date)}
                </p>
                <div className={styles.proseBlock}>{effective.content}</div>
              </div>
            )}

            {open && (
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>
                  Revision v{open.version_number} <StatusPill status={open.status} />
                </h2>
                <p className={styles.sectionSubtitle}>
                  {open.change_summary} — by {open.created_by}
                </p>
                <div className={styles.proseBlock}>{open.content}</div>
              </div>
            )}

            <div className={styles.grid2}>
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Version history</h2>
                <ul className={styles.timeline}>
                  {data.versions.map((v) => (
                    <li key={v.id} className={`${styles.timelineItem} ${v.status === 'effective' ? styles.timelineItemActive : ''}`}>
                      <strong>v{v.version_number}</strong> <StatusPill status={v.status} />
                      <div>{v.change_summary}</div>
                      <div className={styles.muted}>
                        Drafted by {v.created_by}
                        {v.approved_by ? ` · approved by ${v.approved_by} on ${fmtDate(v.approved_at)}` : ''}
                        {v.rejection_reason ? ` · rejected: ${v.rejection_reason}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Acknowledgements{effective ? ` (v${effective.version_number})` : ''}</h2>
                {data.acknowledgements.length === 0 ? (
                  <div className={styles.emptyState}>{effective ? 'Nobody has acknowledged this version yet.' : 'Acknowledgement opens once a version is in force.'}</div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Person</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.acknowledgements.map((a) => (
                        <tr key={a.user_email}>
                          <td>{a.user_email}</td>
                          <td>{fmtDate(a.acknowledged_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        <Modal isOpen={dialog === 'revise' || dialog === 'edit'} onClose={() => setDialog(null)} title={dialog === 'revise' ? 'Revise SOP' : 'Edit draft'} size="lg">
          <div className={styles.modalStack}>
            <Field label="Title" htmlFor="rev-title">
              <input id="rev-title" className={styles.textInput} value={draftForm.title} onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })} />
            </Field>
            <Field label="What changed and why" htmlFor="rev-summary">
              <input id="rev-summary" className={styles.textInput} value={draftForm.changeSummary} maxLength={500} onChange={(e) => setDraftForm({ ...draftForm, changeSummary: e.target.value })} />
            </Field>
            <div>
              <label className={styles.label} htmlFor="rev-content">
                Procedure
              </label>
              <textarea id="rev-content" className={styles.textArea} style={{ minHeight: 260 }} value={draftForm.content} onChange={(e) => setDraftForm({ ...draftForm, content: e.target.value })} />
            </div>
            <p className={styles.sectionSubtitle}>The version currently in force stays in force until this revision is approved.</p>
            <div className={styles.actionsRow}>
              <Button isLoading={busy} onClick={() => void saveRevision()}>
                {dialog === 'revise' ? 'Start revision' : 'Save draft'}
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <PromptModal
          isOpen={dialog === 'reject'}
          title="Reject revision"
          label="Reason for rejection"
          placeholder="What must change before this can be approved?"
          confirmLabel="Reject"
          confirmVariant="danger"
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            if (token && (await act(() => rejectSop(token, id, reason), 'Revision rejected'))) setDialog(null);
          }}
        />
        <PromptModal
          isOpen={dialog === 'retire'}
          title="Retire SOP"
          label="Reason for retiring"
          placeholder="e.g. Process discontinued. Retiring leaves this department without a procedure in force."
          confirmLabel="Retire SOP"
          confirmVariant="danger"
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            if (token && (await act(() => retireSop(token, id, reason), 'SOP retired'))) setDialog(null);
          }}
        />
      </div>
    </ModuleLayout>
  );
}
