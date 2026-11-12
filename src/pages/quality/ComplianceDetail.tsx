import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertOctagon, ClipboardCheck, ClipboardEdit, FilePlus2, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import {
  REQUIREMENT_CATEGORIES,
  QUALITY_DEPARTMENTS,
  addRequirementEvidence,
  assessRequirement,
  fetchRequirementById,
  qualityDepartmentLabel,
  raiseNcrForRequirement,
  removeRequirementEvidence,
  requirementCategoryLabel,
  updateRequirement,
  type AssessRequirementPayload,
  type QualityDepartment,
  type RequirementCategory,
  type RequirementDetail as RequirementDetailData,
  type RequirementRisk,
} from '@/services/seedLotRealtimeClient';
import { useQualitySession } from './useQualitySession';
import {
  ErrorCard,
  Field,
  Notice,
  REQUIREMENT_STATUS_OPTIONS,
  RequirementStatusPill,
  RiskPill,
  StatusPill,
  fmtDate,
  todayIso,
  useQualityAction,
  useQualityLoad,
} from './shared';
import styles from './Quality.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
type Dialog = null | 'assess' | 'evidence' | 'edit';

const blankAssess = {
  status: 'non_compliant' as AssessRequirementPayload['status'],
  currentStatus: '',
  gap: '',
  risk: 'medium' as RequirementRisk,
  correctiveAction: '',
  responsibleEmail: '',
  targetDate: '',
  nextReviewDate: '',
};

export default function ComplianceDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, error: sessionError } = useQualitySession();
  const { run, busy } = useQualityAction();
  const canManage = usePermission('manage_compliance');

  const detail = useQualityLoad<RequirementDetailData>(token, (t) => fetchRequirementById(t, id), [id]);
  const data = detail.data && !Array.isArray(detail.data) && 'requirement' in detail.data ? detail.data : null;
  const req = data?.requirement ?? null;

  const [dialog, setDialog] = useState<Dialog>(null);
  const [assess, setAssess] = useState(blankAssess);
  const [evidence, setEvidence] = useState({ title: '', reference: '', description: '' });
  const [edit, setEdit] = useState({ regulation: '', reference: '', title: '', description: '', category: 'other' as RequirementCategory, department: 'quality' as QualityDepartment });

  const isGap = req ? req.status === 'partially_compliant' || req.status === 'non_compliant' : false;
  const ncrOpen = req ? req.ncr_status === 'open' || req.ncr_status === 'investigating' : false;
  const gapLike = assess.status === 'partially_compliant' || assess.status === 'non_compliant';

  const act = async <T,>(fn: () => Promise<T>, message: string | ((r: T) => string)) => {
    const done = await run(fn, message);
    if (done) await detail.reload();
    return done;
  };

  const openAssess = () => {
    if (!req) return;
    setAssess({
      ...blankAssess,
      status: req.status === 'not_assessed' || req.status === 'compliant' ? 'non_compliant' : (req.status as AssessRequirementPayload['status']),
      currentStatus: req.current_status ?? '',
      gap: req.gap ?? '',
      risk: req.risk ?? 'medium',
      correctiveAction: req.corrective_action ?? '',
      responsibleEmail: req.responsible_email ?? '',
      targetDate: req.target_date?.slice(0, 10) ?? '',
    });
    setDialog('assess');
  };

  const openEdit = () => {
    if (!req) return;
    setEdit({ regulation: req.regulation, reference: req.reference ?? '', title: req.title, description: req.description, category: req.category, department: req.department });
    setDialog('edit');
  };

  const submitAssess = async () => {
    if (!token || !req) return;
    if (!assess.currentStatus.trim()) {
      addToast(assess.status === 'not_applicable' ? 'Explain why this requirement does not apply.' : 'Describe the current position.', 'error');
      return;
    }
    if (gapLike && (!assess.gap.trim() || !assess.responsibleEmail.trim() || !assess.targetDate)) {
      addToast('A gap needs a description, a responsible person and a target date.', 'error');
      return;
    }
    const payload: AssessRequirementPayload = {
      status: assess.status,
      currentStatus: assess.currentStatus.trim(),
      ...(gapLike
        ? {
            gap: assess.gap.trim(),
            risk: assess.risk,
            correctiveAction: assess.correctiveAction.trim() || undefined,
            responsibleEmail: assess.responsibleEmail.trim(),
            targetDate: assess.targetDate,
          }
        : {}),
      ...(assess.status === 'compliant' && assess.nextReviewDate ? { nextReviewDate: assess.nextReviewDate } : {}),
    };
    if (await act(() => assessRequirement(token, req.id, payload), 'Assessment recorded')) setDialog(null);
  };

  const submitEvidence = async () => {
    if (!token || !req) return;
    if (!evidence.title.trim() || (!evidence.reference.trim() && !evidence.description.trim())) {
      addToast('Give the evidence a title and a reference (document, link or record number) or a description.', 'error');
      return;
    }
    const done = await act(
      () =>
        addRequirementEvidence(token, req.id, {
          title: evidence.title.trim(),
          reference: evidence.reference.trim() || undefined,
          description: evidence.description.trim() || undefined,
        }),
      'Evidence added',
    );
    if (done) {
      setDialog(null);
      setEvidence({ title: '', reference: '', description: '' });
    }
  };

  const submitEdit = async () => {
    if (!token || !req) return;
    if (!edit.regulation.trim() || !edit.title.trim() || !edit.description.trim()) {
      addToast('Regulation, requirement and description are required.', 'error');
      return;
    }
    const done = await act(
      () =>
        updateRequirement(token, req.id, {
          regulation: edit.regulation.trim(),
          reference: edit.reference.trim() || undefined,
          title: edit.title.trim(),
          description: edit.description.trim(),
          category: edit.category,
          department: edit.department,
          sopId: req.sop_id ?? undefined,
        }),
      'Requirement updated',
    );
    if (done) setDialog(null);
  };

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/quality/compliance')}>
          ← Back to the compliance register
        </button>
        <ErrorCard message={sessionError ?? detail.error} />
        {detail.loading && !req && <div className={styles.card}>Loading…</div>}

        {req && data && (
          <>
            <div className={styles.header}>
              <div>
                <h1 className={styles.title}>
                  {req.req_code} — {req.title}
                </h1>
                <p className={styles.subtitle}>
                  <RequirementStatusPill status={req.status} /> {req.risk && <RiskPill risk={req.risk} />} · {req.regulation}
                  {req.reference ? ` (${req.reference})` : ''} · {requirementCategoryLabel(req.category)} · {qualityDepartmentLabel(req.department)}
                </p>
              </div>
              <div className={styles.controls}>
                <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void detail.reload()}>
                  Refresh
                </Button>
              </div>
            </div>

            <RecordAiPanel recordType="quality.compliance" record={data} label={req.req_code} />
            {req.is_overdue && <Notice tone="bad">The target date for closing this gap ({fmtDate(req.target_date)}) has passed.</Notice>}
            {req.review_overdue && req.status === 'compliant' && <Notice tone="warn">This requirement was due for re-assessment on {fmtDate(req.next_review_date)}.</Notice>}
            {isGap && !req.ncr_id && <Notice tone="warn">This gap is not yet being tracked as a non-conformance, so no corrective action or verification is driving it to closure.</Notice>}
            {ncrOpen && (
              <Notice>
                {req.ncr_code} is open for this gap. The requirement cannot be marked compliant until it is closed.
              </Notice>
            )}

            {canManage && (
              <div className={styles.card}>
                <div className={styles.actionsRow}>
                  <Button leftIcon={ClipboardEdit} onClick={openAssess}>
                    {req.status === 'not_assessed' ? 'Assess' : 'Re-assess'}
                  </Button>
                  <Button variant="secondary" leftIcon={FilePlus2} onClick={() => setDialog('evidence')}>
                    Attach evidence
                  </Button>
                  {isGap && !ncrOpen && (
                    <Button
                      variant="secondary"
                      leftIcon={AlertOctagon}
                      isLoading={busy}
                      onClick={() => token && void act(() => raiseNcrForRequirement(token, req.id), (r) => `${r.ncr.ncr_code} raised for this gap`)}
                    >
                      Raise non-conformance
                    </Button>
                  )}
                  <Button variant="secondary" leftIcon={Pencil} onClick={openEdit}>
                    Edit requirement
                  </Button>
                </div>
              </div>
            )}

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Requirement</h2>
              <div className={styles.proseBlock}>{req.description}</div>
              {req.sop_code && (
                <p style={{ marginTop: '0.75rem' }}>
                  Governing SOP:{' '}
                  <button className={styles.rowButton} onClick={() => navigate(`/quality/sops/${req.sop_id}`)}>
                    {req.sop_code}
                  </button>
                </p>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Assessment</h2>
              {req.status === 'not_assessed' ? (
                <div className={styles.emptyState}>Not assessed yet.</div>
              ) : (
                <>
                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Assessed by</span>
                      {req.assessed_by} on {fmtDate(req.assessed_at)}
                    </div>
                    {isGap && (
                      <>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Responsible</span>
                          {req.responsible_email}
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Target date</span>
                          <span className={req.is_overdue ? styles.overdue : undefined}>{fmtDate(req.target_date)}</span>
                        </div>
                      </>
                    )}
                    {req.status === 'compliant' && (
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Next review</span>
                        {fmtDate(req.next_review_date)}
                      </div>
                    )}
                  </div>
                  <h3 className={styles.sectionTitle}>{req.status === 'not_applicable' ? 'Why it does not apply' : 'Current position'}</h3>
                  <div className={styles.proseBlock}>{req.current_status}</div>
                  {isGap && (
                    <>
                      <h3 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
                        Gap
                      </h3>
                      <div className={styles.proseBlock}>{req.gap}</div>
                      <h3 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
                        Corrective action
                      </h3>
                      <div className={styles.proseBlock}>{req.corrective_action ?? 'Not yet defined — raise a non-conformance and add CAPAs.'}</div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Evidence</h2>
              {data.evidence.length === 0 ? (
                <div className={styles.emptyState}>No evidence attached. A requirement cannot be marked compliant without it.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Evidence</th>
                        <th>Reference</th>
                        <th>Added</th>
                        {canManage && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {data.evidence.map((e) => (
                        <tr key={e.id}>
                          <td>
                            {e.title}
                            {e.description && <div className={styles.thresholdNote}>{e.description}</div>}
                          </td>
                          <td>{e.reference ?? '—'}</td>
                          <td>
                            {fmtDate(e.added_at)} · {e.added_by}
                          </td>
                          {canManage && (
                            <td>
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={Trash2}
                                onClick={() => token && void act(() => removeRequirementEvidence(token, req.id, e.id), 'Evidence removed')}
                              >
                                Remove
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {req.ncr_id && (
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Tracked as</h2>
                <p>
                  <button className={styles.rowButton} onClick={() => navigate(`/quality/ncrs/${req.ncr_id}`)}>
                    {req.ncr_code}
                  </button>{' '}
                  {req.ncr_status && <StatusPill status={req.ncr_status} />}
                </p>
                {data.capas.length > 0 && (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Type</th>
                          <th>Owner</th>
                          <th>Due</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.capas.map((c) => (
                          <tr key={c.id}>
                            <td>
                              {c.capa_code} — {c.title}
                            </td>
                            <td>{c.action_type}</td>
                            <td>{c.owner_email}</td>
                            <td>{fmtDate(c.due_date)}</td>
                            <td>
                              <StatusPill status={c.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <Modal isOpen={dialog === 'assess'} onClose={() => setDialog(null)} title={`Assess ${req.req_code}`} size="lg">
              <div className={styles.modalStack}>
                <Field label="Verdict" htmlFor="as-status">
                  <select id="as-status" className={styles.select} value={assess.status} onChange={(e) => setAssess({ ...assess, status: e.target.value as AssessRequirementPayload['status'] })}>
                    {REQUIREMENT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div>
                  <label className={styles.label} htmlFor="as-current">
                    {assess.status === 'not_applicable' ? 'Why it does not apply' : 'Current position (what you found)'}
                  </label>
                  <textarea id="as-current" className={styles.textArea} value={assess.currentStatus} onChange={(e) => setAssess({ ...assess, currentStatus: e.target.value })} />
                </div>
                {assess.status === 'compliant' && (
                  <>
                    <Notice>
                      Evidence must already be attached ({data.evidence.length} on file){req.ncr_id ? ', and the linked non-conformance must be closed' : ''}.
                    </Notice>
                    <Field label="Next review date (default 12 months)" htmlFor="as-review">
                      <input id="as-review" className={styles.textInput} type="date" min={todayIso()} value={assess.nextReviewDate} onChange={(e) => setAssess({ ...assess, nextReviewDate: e.target.value })} />
                    </Field>
                  </>
                )}
                {gapLike && (
                  <>
                    <div>
                      <label className={styles.label} htmlFor="as-gap">
                        Gap
                      </label>
                      <textarea id="as-gap" className={styles.textArea} value={assess.gap} onChange={(e) => setAssess({ ...assess, gap: e.target.value })} />
                    </div>
                    <div>
                      <label className={styles.label} htmlFor="as-action">
                        Corrective action (optional here — CAPAs carry the detail)
                      </label>
                      <textarea id="as-action" className={styles.textArea} value={assess.correctiveAction} onChange={(e) => setAssess({ ...assess, correctiveAction: e.target.value })} />
                    </div>
                    <div className={styles.twoCol}>
                      <Field label="Risk" htmlFor="as-risk">
                        <select id="as-risk" className={styles.select} value={assess.risk} onChange={(e) => setAssess({ ...assess, risk: e.target.value as RequirementRisk })}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </Field>
                      <Field label="Responsible person (email)" htmlFor="as-owner">
                        <input id="as-owner" className={styles.textInput} type="email" value={assess.responsibleEmail} onChange={(e) => setAssess({ ...assess, responsibleEmail: e.target.value })} />
                      </Field>
                      <Field label="Target date" htmlFor="as-target">
                        <input id="as-target" className={styles.textInput} type="date" min={todayIso()} value={assess.targetDate} onChange={(e) => setAssess({ ...assess, targetDate: e.target.value })} />
                      </Field>
                    </div>
                  </>
                )}
                <div className={styles.actionsRow}>
                  <Button isLoading={busy} onClick={() => void submitAssess()}>
                    Record assessment
                  </Button>
                  <Button variant="secondary" onClick={() => setDialog(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Modal>

            <Modal isOpen={dialog === 'evidence'} onClose={() => setDialog(null)} title="Attach evidence">
              <div className={styles.modalStack}>
                <Field label="Title" htmlFor="ev-title">
                  <input id="ev-title" className={styles.textInput} value={evidence.title} maxLength={200} placeholder="e.g. Seed dealer licence, Godown 2" onChange={(e) => setEvidence({ ...evidence, title: e.target.value })} />
                </Field>
                <Field label="Reference (document no., link or record number)" htmlFor="ev-ref">
                  <input id="ev-ref" className={styles.textInput} value={evidence.reference} maxLength={500} onChange={(e) => setEvidence({ ...evidence, reference: e.target.value })} />
                </Field>
                <div>
                  <label className={styles.label} htmlFor="ev-desc">
                    Description (optional if a reference is given)
                  </label>
                  <textarea id="ev-desc" className={styles.textArea} value={evidence.description} onChange={(e) => setEvidence({ ...evidence, description: e.target.value })} />
                </div>
                <div className={styles.actionsRow}>
                  <Button isLoading={busy} onClick={() => void submitEvidence()}>
                    Attach
                  </Button>
                  <Button variant="secondary" onClick={() => setDialog(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Modal>

            <Modal isOpen={dialog === 'edit'} onClose={() => setDialog(null)} title="Edit requirement" size="lg">
              <div className={styles.modalStack}>
                <div className={styles.twoCol}>
                  <Field label="Regulation / source" htmlFor="ed-reg">
                    <input id="ed-reg" className={styles.textInput} value={edit.regulation} maxLength={150} onChange={(e) => setEdit({ ...edit, regulation: e.target.value })} />
                  </Field>
                  <Field label="Clause / reference" htmlFor="ed-ref">
                    <input id="ed-ref" className={styles.textInput} value={edit.reference} maxLength={100} onChange={(e) => setEdit({ ...edit, reference: e.target.value })} />
                  </Field>
                </div>
                <Field label="Requirement" htmlFor="ed-title">
                  <input id="ed-title" className={styles.textInput} value={edit.title} maxLength={200} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                </Field>
                <div>
                  <label className={styles.label} htmlFor="ed-desc">
                    Description
                  </label>
                  <textarea id="ed-desc" className={styles.textArea} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                </div>
                <div className={styles.twoCol}>
                  <Field label="Category" htmlFor="ed-cat">
                    <select id="ed-cat" className={styles.select} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as RequirementCategory })}>
                      {REQUIREMENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Department" htmlFor="ed-dept">
                    <select id="ed-dept" className={styles.select} value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value as QualityDepartment })}>
                      {QUALITY_DEPARTMENTS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className={styles.actionsRow}>
                  <Button isLoading={busy} onClick={() => void submitEdit()}>
                    Save
                  </Button>
                  <Button variant="secondary" onClick={() => setDialog(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Modal>
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
