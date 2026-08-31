import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, PlayCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  WORKFLOW_STAGE_DISPLAY,
  approveWorkflowStage,
  cancelWorkflow,
  connectInventorySocket,
  fetchSeedLots,
  listWorkflows,
  login,
  rejectWorkflowStage,
  startWorkflow,
  type InventorySocketEvent,
  type RealtimeSeedLot,
  type WorkflowStageKey,
  type WorkflowWithStages,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedProductionWorkflow.module.css';

function workflowStatusClass(status: string): string {
  return (
    {
      in_progress: styles.statusInProgress,
      completed: styles.statusCompleted,
      cancelled: styles.statusCancelled,
    }[status] ?? styles.statusInProgress
  );
}

function stageCardClass(status: string): string {
  return (
    {
      approved: styles.stageApproved,
      ready: styles.stageReady,
      pending: styles.stagePending,
      rejected: styles.stageRejected,
    }[status] ?? ''
  );
}

function stageBadgeClass(status: string): string {
  return (
    {
      approved: styles.statusApproved,
      ready: styles.statusReady,
      pending: styles.statusPending,
      rejected: styles.statusRejected,
    }[status] ?? ''
  );
}

export default function SeedProductionWorkflow() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(1); // Breeder by default
  const [token, setToken] = useState<string | null>(null);
  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowWithStages[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowWithStages | null>(null);

  const [startLotId, setStartLotId] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  const [busyStage, setBusyStage] = useState<WorkflowStageKey | null>(null);
  const [rejectingStage, setRejectingStage] = useState<WorkflowStageKey | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const socketRef = useRef<WebSocket | null>(null);

  const lotLabel = useCallback(
    (id: string) => lots.find((lot) => lot.id === id)?.lot_code ?? id.slice(0, 8),
    [lots],
  );

  const refresh = useCallback(async (accessToken: string, workflowId?: string) => {
    const list = await listWorkflows(accessToken);
    setWorkflows(list);
    if (workflowId) {
      const found = list.find((w) => w.id === workflowId);
      if (found) setCurrentWorkflow(found);
    } else if (list.length > 0) {
      setCurrentWorkflow((current) => current ?? list[0]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);

        const [lotsResult] = await Promise.all([fetchSeedLots(accessToken), refresh(accessToken)]);
        if (cancelled) return;
        setLots(lotsResult);

        socketRef.current?.close();
        const socket = connectInventorySocket(accessToken, {
          onEvent: (event: InventorySocketEvent) => {
            let label: string | null = null;
            switch (event.event) {
              case 'WORKFLOW_STARTED':
                label = `Workflow started by ${event.payload.startedBy}`;
                break;
              case 'WORKFLOW_STAGE_APPROVED':
                label = `${event.payload.stageKey.replace(/_/g, ' ')} approved by ${event.payload.approvedBy}`;
                break;
              case 'WORKFLOW_STAGE_REJECTED':
                label = `${event.payload.stageKey.replace(/_/g, ' ')} rejected by ${event.payload.rejectedBy}`;
                break;
              case 'WORKFLOW_CANCELLED':
                label = `Workflow cancelled by ${event.payload.cancelledBy}`;
                break;
              default:
                return;
            }
            setNotifications((prev) => [label!, ...prev].slice(0, 5));
            void refresh(accessToken, event.payload.workflowId);
          },
        });
        socketRef.current = socket;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the workflow service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const foundationLots = lots.filter((lot) => lot.stage === 'Foundation');

  const handleStart = async () => {
    if (!token || !startLotId) return;
    setStarting(true);
    setError(null);
    try {
      const workflow = await startWorkflow(token, startLotId);
      addToast('Production workflow started', 'success');
      setCurrentWorkflow(workflow);
      await refresh(token, workflow.id);
      setStartLotId('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start workflow';
      setError(message);
      addToast(message, 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleApprove = async (stageKey: WorkflowStageKey) => {
    if (!token || !currentWorkflow) return;
    setBusyStage(stageKey);
    try {
      const updated = await approveWorkflowStage(token, currentWorkflow.id, stageKey);
      setCurrentWorkflow(updated);
      addToast(`${stageKey.replace(/_/g, ' ')} approved`, 'success');
      await refresh(token, updated.id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to approve stage', 'error');
    } finally {
      setBusyStage(null);
    }
  };

  const handleReject = async (stageKey: WorkflowStageKey) => {
    if (!token || !currentWorkflow) return;
    if (!rejectReason.trim()) {
      addToast('Enter a rejection reason first', 'error');
      return;
    }
    setBusyStage(stageKey);
    try {
      const updated = await rejectWorkflowStage(token, currentWorkflow.id, stageKey, rejectReason.trim());
      setCurrentWorkflow(updated);
      addToast(`${stageKey.replace(/_/g, ' ')} rejected`, 'success');
      setRejectingStage(null);
      setRejectReason('');
      await refresh(token, updated.id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to reject stage', 'error');
    } finally {
      setBusyStage(null);
    }
  };

  const handleCancel = async () => {
    if (!token || !currentWorkflow) return;
    try {
      await cancelWorkflow(token, currentWorkflow.id);
      addToast('Workflow cancelled', 'success');
      await refresh(token, currentWorkflow.id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to cancel workflow', 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Certified Seed Production Workflow</h1>
          <p className={styles.subtitle}>
            Foundation lot → pre-certified inspection → certified production → quality testing → market-ready release —
            each stage gated by its owning department, validated against real quality and certification data.
          </p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {notifications.length > 0 ? (
        <div className={styles.notificationBanner}>Live: {notifications[0]}</div>
      ) : null}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Start New Workflow</h2>
        <p className={styles.sectionSubtitle}>Only Foundation-stage lots can begin a certified production workflow.</p>
        <div className={styles.controls}>
          <select className={styles.select} value={startLotId} onChange={(e) => setStartLotId(e.target.value)}>
            <option value="">Select a Foundation lot</option>
            {foundationLots.map((lot) => (
              <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.crop}</option>
            ))}
          </select>
          <Button leftIcon={PlayCircle} isLoading={starting} disabled={!startLotId} onClick={() => void handleStart()}>
            Start Workflow
          </Button>
        </div>
      </div>

      {currentWorkflow ? (
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 className={styles.sectionTitle}>
                {lotLabel(currentWorkflow.seed_lot_id)}{' '}
                <span className={`${styles.statusBadge} ${workflowStatusClass(currentWorkflow.status)}`}>
                  {currentWorkflow.status.replace('_', ' ')}
                </span>
              </h2>
              <p className={styles.sectionSubtitle}>
                Started by {currentWorkflow.started_by} on {new Date(currentWorkflow.started_at).toLocaleString()}
                {currentWorkflow.certified_lot_id ? <> · Certified lot: {lotLabel(currentWorkflow.certified_lot_id)}</> : null}
              </p>
            </div>
            {currentWorkflow.status === 'in_progress' ? (
              <Button variant="secondary" size="sm" onClick={() => void handleCancel()}>Cancel Workflow</Button>
            ) : null}
          </div>

          <div className={styles.pipeline}>
            {currentWorkflow.stages.map((stage) => {
              const display = WORKFLOW_STAGE_DISPLAY.find((d) => d.key === stage.stage_key)!;
              const isOverdue = stage.due_at && stage.status !== 'approved' && new Date(stage.due_at) < new Date();
              const canAct = stage.status === 'ready' || stage.status === 'rejected';

              return (
                <div key={stage.id} className={`${styles.stageCard} ${stageCardClass(stage.status)}`}>
                  <div className={styles.stageDepartment}>{display.department}</div>
                  <div className={styles.stageLabel}>{display.label}</div>
                  <span className={`${styles.statusBadge} ${stageBadgeClass(stage.status)}`}>{stage.status}</span>

                  {stage.due_at ? (
                    <div className={`${styles.stageMeta} ${isOverdue ? styles.overdue : ''}`}>
                      {isOverdue ? 'Overdue — ' : 'Due '}
                      {new Date(stage.due_at).toLocaleDateString()}
                    </div>
                  ) : null}
                  {stage.approved_by ? (
                    <div className={styles.stageMeta}>
                      Approved by {stage.approved_by} · {new Date(stage.approved_at!).toLocaleString()}
                    </div>
                  ) : null}
                  {stage.rejection_reason ? (
                    <div className={styles.stageMeta}>Rejected: {stage.rejection_reason}</div>
                  ) : null}

                  {canAct && currentWorkflow.status === 'in_progress' ? (
                    <div className={styles.stageActions}>
                      <Button
                        size="sm"
                        leftIcon={CheckCircle2}
                        isLoading={busyStage === stage.stage_key}
                        onClick={() => void handleApprove(stage.stage_key)}
                      >
                        Approve
                      </Button>
                      {rejectingStage === stage.stage_key ? (
                        <>
                          <textarea
                            className={styles.textarea}
                            placeholder="Rejection reason"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={XCircle}
                            isLoading={busyStage === stage.stage_key}
                            onClick={() => void handleReject(stage.stage_key)}
                          >
                            Confirm Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={XCircle}
                          onClick={() => {
                            setRejectingStage(stage.stage_key);
                            setRejectReason('');
                          }}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.emptyState}>No workflow selected — start one above or pick one below.</div>
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Recent Workflows</h2>
        {workflows.length === 0 ? (
          <div className={styles.emptyState}>No production workflows yet.</div>
        ) : (
          workflows.map((workflow) => {
            const approvedCount = workflow.stages.filter((s) => s.status === 'approved').length;
            return (
              <div
                key={workflow.id}
                className={`${styles.workflowRow} ${currentWorkflow?.id === workflow.id ? styles.workflowRowActive : ''}`}
                onClick={() => setCurrentWorkflow(workflow)}
              >
                <div>
                  <strong>{lotLabel(workflow.seed_lot_id)}</strong>
                  <div className={styles.stageMeta}>{approvedCount}/5 stages approved</div>
                </div>
                <span className={`${styles.statusBadge} ${workflowStatusClass(workflow.status)}`}>
                  {workflow.status.replace('_', ' ')}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
