import { useNavigate } from 'react-router-dom';
import { AlertOctagon, ClipboardCheck, FileText, Lock, MessageSquareWarning, RefreshCw, Wrench } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import {
  acknowledgeSop,
  fetchPendingSopAcknowledgements,
  fetchQualityDashboard,
  qualityDepartmentLabel,
  type PendingSopAcknowledgement,
  type QualityDashboardData,
} from '@/services/seedLotRealtimeClient';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Notice, Pill, fmtDate, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

/**
 * The client falls back to an empty array when the server is unreachable
 * (see request() in seedLotRealtimeClient). A dashboard has no meaningful
 * "empty" form, so anything that is not the expected object is treated as
 * "unavailable" rather than rendered as zeros — zeros would read as "no
 * problems" on a page whose whole purpose is to say where the problems are.
 */
function isDashboard(value: unknown): value is QualityDashboardData {
  return typeof value === 'object' && value !== null && 'nonConformances' in value && 'sops' in value;
}

const dash = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '—' : `${n}${suffix}`);

export default function QualityDashboard() {
  const navigate = useNavigate();
  const { token, error: sessionError, reload: reloadSession } = useQualitySession();
  const canAcknowledge = usePermission('acknowledge_sop');
  const { run, busy } = useQualityAction();

  const dashboard = useQualityLoad<unknown>(token, fetchQualityDashboard);
  const pending = useQualityLoad<PendingSopAcknowledgement[]>(token, fetchPendingSopAcknowledgements);

  const data = isDashboard(dashboard.data) ? dashboard.data : null;
  const unavailable = !dashboard.loading && !dashboard.error && !sessionError && !data;
  const pendingList = Array.isArray(pending.data) ? pending.data : [];

  const refresh = () => {
    reloadSession();
    void dashboard.reload();
    void pending.reload();
  };

  const acknowledge = async (id: string) => {
    if (!token) return;
    const done = await run(() => acknowledgeSop(token, id), 'Acknowledged');
    if (done) void pending.reload();
  };

  const attention: { key: string; label: string; count: number; tone: 'bad' | 'warn'; to: string }[] = data
    ? [
        { key: 'ncr-crit', label: 'Open critical non-conformances', count: data.nonConformances.open_critical, tone: 'bad', to: '/quality/ncrs' },
        { key: 'ncr-over', label: 'Overdue non-conformances', count: data.nonConformances.overdue, tone: 'bad', to: '/quality/ncrs' },
        { key: 'capa-over', label: 'Overdue corrective / preventive actions', count: data.capas.overdue, tone: 'bad', to: '/quality/capas' },
        { key: 'capa-verify', label: 'Actions awaiting effectiveness verification', count: data.capas.awaiting_verification, tone: 'warn', to: '/quality/capas' },
        { key: 'cmp-recall', label: 'Complaints with a recall recommended', count: data.complaints.recall_recommended, tone: 'bad', to: '/quality/complaints' },
        { key: 'cmp-crit', label: 'Open critical complaints', count: data.complaints.open_critical, tone: 'bad', to: '/quality/complaints' },
        { key: 'sop-over', label: 'SOPs past their review date', count: data.sops.reviewOverdue, tone: 'warn', to: '/quality/sops' },
        { key: 'sop-review', label: 'SOP revisions waiting for approval', count: data.sops.in_review, tone: 'warn', to: '/quality/sops' },
      ].filter((a) => a.count > 0) as { key: string; label: string; count: number; tone: 'bad' | 'warn'; to: string }[]
    : [];

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Quality Dashboard</h1>
            <p className={styles.subtitle}>
              One view of the quality spine — procedures in force, what has gone wrong, what is being done about it, and what has been held back
              from sale. Every figure is a live count of stored records.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={refresh}>
              Refresh
            </Button>
          </div>
        </div>

        <ErrorCard message={sessionError ?? dashboard.error} />
        {unavailable && (
          <Notice tone="warn">The quality service is not reachable right now, so no figures are shown. Nothing here should be read as "no problems".</Notice>
        )}

        {data && (
          <>
            <div className={styles.kpiGrid}>
              <KpiCard
                title="Open non-conformances"
                value={String(data.nonConformances.open_total)}
                subValue={`${data.nonConformances.open_critical} critical · ${data.nonConformances.open_major} major · ${data.nonConformances.open_minor} minor`}
                icon={AlertOctagon}
              />
              <KpiCard
                title="Open CAPAs"
                value={String(data.capas.open_total)}
                subValue={`${data.capas.overdue} overdue · ${data.capas.awaiting_verification} awaiting verification`}
                icon={Wrench}
              />
              <KpiCard
                title="Open complaints"
                value={String(data.complaints.open_total)}
                subValue={`${data.complaints.received_last_30d} received in the last 30 days`}
                icon={MessageSquareWarning}
              />
              <KpiCard title="Lots on quality hold" value={String(data.holds.active)} subValue="Blocked from allocation and packaging" icon={Lock} />
              <KpiCard
                title="SOP coverage"
                value={`${data.sops.coveragePercent}%`}
                subValue={`${data.sops.departmentsCovered} of ${data.sops.departmentsTotal} departments have an effective SOP`}
                icon={FileText}
              />
            </div>

            <div className={styles.grid2}>
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Needs attention</h2>
                <p className={styles.sectionSubtitle}>Only items that are actually outstanding are listed.</p>
                {attention.length === 0 ? (
                  <div className={styles.emptyState}>Nothing outstanding — no overdue actions, critical items or pending approvals.</div>
                ) : (
                  <ul className={styles.attentionList}>
                    {attention.map((a) => (
                      <li key={a.key} className={styles.attentionItem}>
                        <span>{a.label}</span>
                        <span className={styles.actionsRow}>
                          <Pill tone={a.tone}>{a.count}</Pill>
                          <Button size="sm" variant="secondary" onClick={() => navigate(a.to)}>
                            Open
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Response times</h2>
                <p className={styles.sectionSubtitle}>Measured from stored timestamps.</p>
                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Avg. days to close an NCR</span>
                    {dash(data.nonConformances.avg_days_to_close, ' days')}
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Avg. days to resolve a complaint (90d)</span>
                    {dash(data.complaints.avg_days_to_resolve_90d, ' days')}
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>NCRs closed (30d)</span>
                    {data.nonConformances.closed_last_30d}
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>CAPAs verified effective (30d)</span>
                    {data.capas.closed_last_30d}
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>CAPAs that failed verification</span>
                    {data.capas.failed_verification}
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>SOPs due for review (30d)</span>
                    {data.sops.reviewDueSoon}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Procedure coverage by department</h2>
              <p className={styles.sectionSubtitle}>
                A department is covered when it has at least one SOP in force. Departments with no SOP have no defined process to audit against.
              </p>
              <div className={styles.coverageGrid}>
                {data.sops.departmentCoverage.map((d) => (
                  <button
                    key={d.department}
                    type="button"
                    className={`${styles.coverageCell} ${d.covered ? styles.coverageCellOk : styles.coverageCellGap}`}
                    style={{ textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
                    onClick={() => navigate('/quality/sops')}
                  >
                    <span className={styles.coverageName}>{qualityDepartmentLabel(d.department)}</span>
                    <span className={d.covered ? styles.successText : styles.errorText}>
                      {d.covered ? `${d.effectiveSops} SOP${d.effectiveSops === 1 ? '' : 's'} in force` : 'No SOP in force'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {canAcknowledge && pendingList.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>SOPs waiting for your acknowledgement</h2>
            <p className={styles.sectionSubtitle}>Confirming you have read a procedure is the record that you were made aware of it.</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>SOP</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Version</th>
                    <th>Effective</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pendingList.slice(0, 8).map((s) => (
                    <tr key={s.id}>
                      <td>
                        <button className={styles.rowButton} onClick={() => navigate(`/quality/sops/${s.id}`)}>
                          {s.sop_code}
                        </button>
                      </td>
                      <td>{s.title}</td>
                      <td>{qualityDepartmentLabel(s.department)}</td>
                      <td>v{s.version_number}</td>
                      <td>{fmtDate(s.effective_date)}</td>
                      <td>
                        <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void acknowledge(s.id)}>
                          I have read this
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
