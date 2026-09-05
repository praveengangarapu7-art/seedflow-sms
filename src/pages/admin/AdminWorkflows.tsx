import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, ExternalLink, GitBranch, RefreshCw, ShieldCheck, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  WORKFLOW_STAGE_DISPLAY,
  cancelWorkflow,
  listWorkflows,
  type WorkflowWithStages,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * Cross-module approval workflows.
 *
 * A seed lot's certification workflow crosses departments — production,
 * inspection, lab, warehouse — so no single module can see the whole thing
 * stuck. This page can: it lists every workflow instance with the stage it is
 * currently sitting on and how long it has been there.
 *
 * Approving and rejecting a stage stays where it belongs — with the
 * department that owns that stage, on the Production workflow page. The only
 * action here is cancel, which is Admin-only on the server and exists for the
 * case a workflow was started against the wrong lot and is blocking a queue.
 */
function stageLabel(stageKey: string): string {
  return WORKFLOW_STAGE_DISPLAY.find((s) => s.key === stageKey)?.label ?? stageKey.replace(/_/g, ' ');
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function AdminWorkflows() {
  const navigate = useNavigate();
  const { token, canAdminister, loading: sessionLoading, error: sessionError, reload } = useAdminSession();
  const { addToast } = useToast();
  const canCancel = usePermission('cancel_any_workflow');

  const [workflows, setWorkflows] = useState<WorkflowWithStages[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      setWorkflows(await listWorkflows(accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load workflows');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const enriched = useMemo(
    () =>
      workflows.map((wf) => {
        const stages = [...(wf.stages ?? [])].sort((a, b) => a.sequence - b.sequence);
        const current = stages.find((s) => s.status === 'pending' || s.status === 'in_progress');
        const approved = stages.filter((s) => s.status === 'approved').length;
        const rejected = stages.find((s) => s.status === 'rejected');
        const waitingDays = daysSince(current?.started_at ?? wf.started_at);
        const overdue = Boolean(current?.due_at && new Date(current.due_at) < new Date());
        return { wf, stages, current, approved, rejected, waitingDays, overdue };
      }),
    [workflows],
  );

  const visible = useMemo(
    () => enriched.filter((row) => (statusFilter ? row.wf.status === statusFilter : true)),
    [enriched, statusFilter],
  );

  const statusesPresent = useMemo(() => Array.from(new Set(workflows.map((w) => w.status))).sort(), [workflows]);
  const inProgress = enriched.filter((r) => r.wf.status === 'in_progress').length;
  const overdueCount = enriched.filter((r) => r.overdue).length;
  const rejectedCount = enriched.filter((r) => Boolean(r.rejected)).length;

  async function handleCancel(workflowId: string, lotId: string) {
    if (!token) return;
    if (!window.confirm(`Cancel the workflow for lot ${lotId.slice(0, 8)}…? Approved stages are not undone.`)) return;
    setPendingId(workflowId);
    try {
      await cancelWorkflow(token, workflowId);
      addToast('Workflow cancelled.', 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to cancel the workflow', 'error');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Approval workflows</h1>
            <p className={styles.subtitle}>
              Every certification workflow in flight, with the stage it is waiting on and how long it has been waiting.
              Approvals stay with the department that owns each stage.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => (token ? void load(token) : reload())}>
              Refresh
            </Button>
            <Button variant="secondary" leftIcon={ExternalLink} onClick={() => navigate('/seed-production-workflow')}>
              Production workflow board
            </Button>
          </div>
        </div>

        {sessionError && (
          <div className={styles.card}>
            <span className={styles.errorText}>{sessionError}</span>
          </div>
        )}
        {error && (
          <div className={styles.card}>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}
        {!sessionLoading && !canAdminister && (
          <div className={styles.readOnlyNotice}>
            <ShieldCheck size={16} />
            Read-only oversight session: workflows are visible and cancellation is not available.
          </div>
        )}

        <div className={styles.kpiGrid}>
          <KpiCard title="Workflows" value={String(workflows.length)} icon={GitBranch} />
          <KpiCard title="In progress" value={String(inProgress)} icon={GitBranch} />
          <KpiCard title="Past due" value={String(overdueCount)} subValue="current stage overdue" icon={Timer} />
          <KpiCard title="With a rejection" value={String(rejectedCount)} icon={Ban} />
        </div>

        <div className={styles.card}>
          <div className={styles.filterBar}>
            <button
              className={`${styles.chip} ${statusFilter === '' ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter('')}
            >
              All statuses
            </button>
            {statusesPresent.map((s) => (
              <button
                key={s}
                className={`${styles.chip} ${statusFilter === s ? styles.chipActive : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {sessionLoading || busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>No workflows match this filter.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Seed lot</th>
                    <th>Status</th>
                    <th>Waiting on</th>
                    <th>Department</th>
                    <th>Progress</th>
                    <th>Waiting</th>
                    <th>Started by</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map(({ wf, stages, current, approved, rejected, waitingDays, overdue }) => (
                    <tr key={wf.id}>
                      <td>
                        <button
                          className={styles.rowButton}
                          onClick={() => navigate(`/seed-lot-detail/${wf.seed_lot_id}`)}
                        >
                          {wf.seed_lot_id.slice(0, 8)}…
                        </button>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            wf.status === 'completed'
                              ? styles.badgeActive
                              : rejected
                                ? styles.badgeError
                                : styles.badgeInfo
                          }`}
                        >
                          {wf.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {rejected ? (
                          <span className={styles.errorText}>rejected at {stageLabel(rejected.stage_key)}</span>
                        ) : current ? (
                          stageLabel(current.stage_key)
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>{current?.department ?? <span className={styles.muted}>—</span>}</td>
                      <td>
                        {approved}/{stages.length} stages
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${stages.length ? (approved / stages.length) * 100 : 0}%` }}
                          />
                        </div>
                      </td>
                      <td className={overdue ? styles.errorText : undefined}>
                        {waitingDays === null ? '—' : `${waitingDays}d`}
                        {overdue && <div style={{ fontSize: '0.72rem' }}>overdue</div>}
                      </td>
                      <td>{wf.started_by}</td>
                      <td>
                        <div className={styles.rowActions}>
                          {canCancel && canAdminister && wf.status !== 'completed' && wf.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="danger"
                              leftIcon={Ban}
                              disabled={pendingId === wf.id}
                              onClick={() => void handleCancel(wf.id, wf.seed_lot_id)}
                            >
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
      </div>
    </ModuleLayout>
  );
}
