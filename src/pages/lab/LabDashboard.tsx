import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, FlaskConical, RefreshCw, Timer, TrendingUp } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { labNav } from '@/config/labNav';
import {
  fetchLabPerformance,
  fetchLabQualityFlags,
  fetchLabSubmissions,
  type LabPerformanceEntry,
  type LabQualityFlag,
  type LabTestSubmission,
} from '@/services/seedLotRealtimeClient';
import { useLabSession } from './useLabSession';
import styles from './Lab.module.css';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, labToday, type PeriodValue } from '@/utils/periodFilter';

function statusBadgeClass(status: string): string {
  const key = `badge${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

function isOverdue(submission: LabTestSubmission): boolean {
  if (submission.status === 'completed' || submission.status === 'failed') return false;
  return new Date(submission.expected_completion_date) < new Date();
}

export default function LabDashboard() {
  const navigate = useNavigate();
  const { token, loading: sessionLoading, error: sessionError, reload } = useLabSession();

  const [submissions, setSubmissions] = useState<LabTestSubmission[]>([]);
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [flags, setFlags] = useState<LabQualityFlag[]>([]);
  const [performance, setPerformance] = useState<LabPerformanceEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      const [subs, openFlags, perf] = await Promise.all([
        fetchLabSubmissions(accessToken),
        fetchLabQualityFlags(accessToken, { resolved: false }),
        fetchLabPerformance(accessToken),
      ]);
      setSubmissions(subs);
      setFlags(openFlags);
      setPerformance(perf);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load laboratory data');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const stats = useMemo(() => {
    const inPeriod = submissions.filter((s) => isDateInPeriod(s.submitted_at, period, labToday()));
    const inProgress = inPeriod.filter((s) => s.status === 'submitted' || s.status === 'in_progress').length;
    const completed = inPeriod.filter((s) => s.status === 'completed');
    const allResults = submissions.flatMap((s) => s.results ?? []);
    const passed = allResults.filter((r) => r.passed).length;
    const passRate = allResults.length > 0 ? Math.round((passed / allResults.length) * 100) : null;
    const overdue = inPeriod.filter(isOverdue).length;
    return {
      total: submissions.length,
      inProgress,
      completedCount: completed.length,
      passRate,
      overdue,
    };
  }, [submissions, period]);

  const recent = useMemo(
    () => [...submissions].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()).slice(0, 8),
    [submissions],
  );

  return (
    <ModuleLayout moduleName="Laboratory" moduleIcon={FlaskConical} navItems={labNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Laboratory Dashboard</h1>
            <p className={styles.subtitle}>
              Live view of every seed sample in the testing pipeline — germination, purity and vigor results scored
              against certification thresholds, with open quality flags and per-lab turnaround.
            </p>
          </div>
          <div className={styles.controls}>
            <PeriodSelect value={period} onChange={setPeriod} />
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => (token ? void load(token) : reload())}>
              Refresh
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

        <div className={styles.kpiGrid}>
          <KpiCard title="Total Submissions" value={String(stats.total)} icon={ClipboardList} />
          <KpiCard title="In Testing" value={String(stats.inProgress)} icon={FlaskConical} />
          <KpiCard title="Pass Rate" value={stats.passRate === null ? '—' : `${stats.passRate}%`} icon={TrendingUp} />
          <KpiCard title="Open Quality Flags" value={String(flags.length)} icon={AlertTriangle} />
          <KpiCard title="Overdue" value={String(stats.overdue)} icon={Timer} />
        </div>

        <div className={styles.grid2}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Recent Submissions</h2>
            <p className={styles.sectionSubtitle}>Newest sample batches sent to partner laboratories.</p>
            {sessionLoading || busy ? (
              <div className={styles.emptyState}>Loading…</div>
            ) : recent.length === 0 ? (
              <div className={styles.emptyState}>No sample submissions yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Lot</th>
                      <th>Laboratory</th>
                      <th>Tests</th>
                      <th>Status</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <button className={styles.rowButton} onClick={() => navigate(`/lab/submissions/${s.id}`)}>
                            {s.lot_code}
                          </button>
                        </td>
                        <td>{s.lab_organization_name}</td>
                        <td>{(s.requested_tests ?? []).join(', ')}</td>
                        <td>
                          <span className={`${styles.badge} ${statusBadgeClass(s.status)}`}>{s.status.replace('_', ' ')}</span>
                        </td>
                        <td>
                          {new Date(s.expected_completion_date).toLocaleDateString()}
                          {isOverdue(s) && <div className={styles.errorText}>overdue</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Open Quality Flags</h2>
            <p className={styles.sectionSubtitle}>
              Raised automatically whenever a result falls below its certification threshold.
            </p>
            {flags.length === 0 ? (
              <div className={styles.emptyState}>No open quality flags — every tested lot is within threshold.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Lot</th>
                      <th>Test</th>
                      <th>Reason</th>
                      <th>Flagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.slice(0, 8).map((f) => (
                      <tr key={f.id}>
                        <td>{f.lot_code}</td>
                        <td>{f.test_type}</td>
                        <td>{f.reason}</td>
                        <td>{new Date(f.flagged_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Laboratory Turnaround</h2>
          <p className={styles.sectionSubtitle}>
            Throughput and reliability per partner lab — sourced from the same records the Lab Performance page details.
          </p>
          {performance.length === 0 ? (
            <div className={styles.emptyState}>No laboratory performance data yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Laboratory</th>
                    <th>Submissions</th>
                    <th>Completed</th>
                    <th>Pass rate</th>
                    <th>Avg turnaround</th>
                    <th>Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((p) => (
                    <tr key={p.labOrganizationId}>
                      <td>{p.labOrganizationName}</td>
                      <td>{p.totalSubmissions}</td>
                      <td>{p.completedCount}</td>
                      <td>{p.passRate === null ? '—' : `${Math.round(p.passRate)}%`}</td>
                      <td>{p.avgTurnaroundDays === null ? '—' : `${p.avgTurnaroundDays.toFixed(1)} days`}</td>
                      <td>{p.overdueCount}</td>
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
