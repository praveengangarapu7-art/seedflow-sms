import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, FlaskConical, RefreshCw, Timer, TrendingUp } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { labNav } from '@/config/labNav';
import { fetchLabPerformance, type LabPerformanceEntry } from '@/services/seedLotRealtimeClient';
import { useLabSession } from './useLabSession';
import styles from './Lab.module.css';

export default function LabPerformance() {
  const { token, error: sessionError } = useLabSession();
  const [entries, setEntries] = useState<LabPerformanceEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      setEntries(await fetchLabPerformance(accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load lab performance');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const totals = useMemo(() => {
    const totalSubmissions = entries.reduce((sum, e) => sum + e.totalSubmissions, 0);
    const totalOverdue = entries.reduce((sum, e) => sum + e.overdueCount, 0);
    const rated = entries.filter((e) => e.passRate !== null);
    const avgPass = rated.length > 0 ? rated.reduce((sum, e) => sum + (e.passRate ?? 0), 0) / rated.length : null;
    const timed = entries.filter((e) => e.avgTurnaroundDays !== null);
    const avgTurnaround =
      timed.length > 0 ? timed.reduce((sum, e) => sum + (e.avgTurnaroundDays ?? 0), 0) / timed.length : null;
    return { totalSubmissions, totalOverdue, avgPass, avgTurnaround, labCount: entries.length };
  }, [entries]);

  const maxSubmissions = useMemo(
    () => entries.reduce((max, e) => Math.max(max, e.totalSubmissions), 0),
    [entries],
  );

  return (
    <ModuleLayout moduleName="Laboratory" moduleIcon={FlaskConical} navItems={labNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Lab Performance</h1>
            <p className={styles.subtitle}>
              How each partner laboratory is actually performing — volume, pass rate, turnaround against the promised
              completion date, and how many submissions are running late.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void load(token)}>
              Refresh
            </Button>
          </div>
        </div>

        {sessionError && <div className={styles.card}><span className={styles.errorText}>{sessionError}</span></div>}
        {error && <div className={styles.card}><span className={styles.errorText}>{error}</span></div>}

        <div className={styles.kpiGrid}>
          <KpiCard title="Partner Labs" value={String(totals.labCount)} icon={FlaskConical} />
          <KpiCard title="Total Submissions" value={String(totals.totalSubmissions)} icon={BarChart3} />
          <KpiCard
            title="Average Pass Rate"
            value={totals.avgPass === null ? '—' : `${Math.round(totals.avgPass)}%`}
            icon={TrendingUp}
          />
          <KpiCard
            title="Average Turnaround"
            value={totals.avgTurnaround === null ? '—' : `${totals.avgTurnaround.toFixed(1)} d`}
            icon={Timer}
          />
          <KpiCard title="Overdue" value={String(totals.totalOverdue)} icon={Timer} />
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Per-Laboratory Breakdown</h2>
          <p className={styles.sectionSubtitle}>
            Turnaround is measured from submission to completion for finished work only; overdue counts submissions
            still open past their expected completion date.
          </p>
          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : entries.length === 0 ? (
            <div className={styles.emptyState}>No laboratory performance data yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Laboratory</th>
                    <th>Volume</th>
                    <th>Completed</th>
                    <th>Failed</th>
                    <th>Pass rate</th>
                    <th>Avg turnaround</th>
                    <th>Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.labOrganizationId}>
                      <td>{e.labOrganizationName}</td>
                      <td>
                        {e.totalSubmissions}
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${Math.round((e.totalSubmissions / Math.max(maxSubmissions, 1)) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td>{e.completedCount}</td>
                      <td>{e.failedCount}</td>
                      <td>{e.passRate === null ? '—' : `${Math.round(e.passRate)}%`}</td>
                      <td>{e.avgTurnaroundDays === null ? '—' : `${e.avgTurnaroundDays.toFixed(1)} days`}</td>
                      <td>
                        {e.overdueCount > 0 ? (
                          <span className={`${styles.badge} ${styles.badgeOpen}`}>{e.overdueCount}</span>
                        ) : (
                          '0'
                        )}
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
