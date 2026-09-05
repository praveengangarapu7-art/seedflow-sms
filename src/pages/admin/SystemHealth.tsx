import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertOctagon, Bug, Database, Gauge, RefreshCw, ShieldCheck, Users as UsersIcon } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import {
  fetchAnomalies,
  fetchApiPerformance,
  fetchDataConsistency,
  fetchErrorLogs,
  fetchFailedOperations,
  fetchUserActivity,
  type AnomalyEntry,
  type ApiPerformanceEntry,
  type DataConsistencySummary,
  type ErrorLogGroup,
  type FailedOperationEntry,
  type UserActivityEntry,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * System health — the operational view of the platform.
 *
 * All six panels come from server/src/modules/monitoring, which has existed
 * since the observability phase but was only ever surfaced inside the
 * Production module (as Seed Monitoring). This is the same data presented for
 * the audience it was actually built for. The Production page is left in
 * place: it is reached by producers looking at their own lots, while this one
 * is reached by whoever is on call.
 *
 * Every monitoring endpoint is requireRole('Admin'), so a Compliance Auditor
 * session genuinely cannot read them — hence the guard rather than an empty
 * table.
 */
const SLOW_ROUTE_MS = 500;

export default function SystemHealth() {
  const { token, canAdminister, loading: sessionLoading, error: sessionError, reload } = useAdminSession();

  const [errors, setErrors] = useState<ErrorLogGroup[]>([]);
  const [performance, setPerformance] = useState<ApiPerformanceEntry[]>([]);
  const [failed, setFailed] = useState<FailedOperationEntry[]>([]);
  const [activity, setActivity] = useState<UserActivityEntry[]>([]);
  const [consistency, setConsistency] = useState<DataConsistencySummary | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'backend' | 'frontend'>('all');

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      const [errs, perf, fails, users, consist, anoms] = await Promise.all([
        fetchErrorLogs(accessToken),
        fetchApiPerformance(accessToken),
        fetchFailedOperations(accessToken),
        fetchUserActivity(accessToken),
        fetchDataConsistency(accessToken),
        fetchAnomalies(accessToken),
      ]);
      setErrors(errs);
      setPerformance(perf);
      setFailed(fails);
      setActivity(users);
      setConsistency(consist);
      setAnomalies(anoms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load system health');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token && canAdminister) void load(token);
  }, [token, canAdminister, load]);

  const visibleErrors = errors.filter((e) => (sourceFilter === 'all' ? true : e.source === sourceFilter));
  const slowRoutes = performance.filter((p) => p.p95DurationMs > SLOW_ROUTE_MS);
  const flaggedAnomalies = anomalies.filter((a) => a.isAnomalous);
  const totalOccurrences = errors.reduce((sum, e) => sum + e.occurrence_count, 0);
  const worstErrorRate = performance.reduce((worst, p) => Math.max(worst, p.errorRate), 0);

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>System health</h1>
            <p className={styles.subtitle}>
              Error groups, API latency, failed operations, user activity, data-consistency checks and volume
              anomalies — the operational picture across every module.
            </p>
          </div>
          <div className={styles.controls}>
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
        {!sessionLoading && !canAdminister && (
          <div className={styles.readOnlyNotice}>
            <ShieldCheck size={16} />
            Monitoring endpoints are Admin-only on the server, so a read-only oversight session cannot read them.
          </div>
        )}

        <div className={styles.kpiGrid}>
          <KpiCard
            title="Error groups"
            value={String(errors.length)}
            subValue={errors.length > 0 ? `${totalOccurrences} occurrences` : undefined}
            icon={Bug}
          />
          <KpiCard
            title="Slow routes"
            value={String(slowRoutes.length)}
            subValue={`p95 over ${SLOW_ROUTE_MS}ms`}
            icon={Gauge}
          />
          <KpiCard title="Failed operations" value={String(failed.length)} icon={AlertOctagon} />
          <KpiCard
            title="Worst error rate"
            value={performance.length === 0 ? '—' : `${Math.round(worstErrorRate * 100)}%`}
            icon={Activity}
          />
          <KpiCard
            title="Anomalies today"
            value={String(flaggedAnomalies.length)}
            subValue={anomalies.length > 0 ? `of ${anomalies.length} metrics` : undefined}
            icon={Activity}
          />
        </div>

        {consistency && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Data consistency</h2>
            <p className={styles.sectionSubtitle}>
              Whole-graph checks that no single module could catch on its own. Anything non-zero here is actionable on
              the Data governance page.
            </p>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Parentage violations</span>
                <span className={consistency.parentageViolationCount > 0 ? styles.errorText : undefined}>
                  {consistency.parentageViolationCount}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Reconciliation discrepancies</span>
                <span className={consistency.reconciliationDiscrepancyCount > 0 ? styles.errorText : undefined}>
                  {consistency.reconciliationDiscrepancyCount}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Orphan lots</span>
                <span className={consistency.orphanLotCount > 0 ? styles.errorText : undefined}>
                  {consistency.orphanLotCount}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Error groups</h2>
          <p className={styles.sectionSubtitle}>
            Faults grouped by fingerprint, so a hundred occurrences of one bug read as one row. Frontend entries arrive
            from the app's own error boundary.
          </p>
          <div className={styles.filterBar}>
            {(['all', 'backend', 'frontend'] as const).map((source) => (
              <button
                key={source}
                className={`${styles.chip} ${sourceFilter === source ? styles.chipActive : ''}`}
                onClick={() => setSourceFilter(source)}
              >
                {source === 'all' ? 'All sources' : source}
              </button>
            ))}
          </div>
          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visibleErrors.length === 0 ? (
            <div className={styles.emptyState}>
              {canAdminister ? 'No errors recorded — nothing has faulted.' : 'Withheld from a read-only session.'}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Message</th>
                    <th>Where</th>
                    <th>Source</th>
                    <th>Count</th>
                    <th>Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleErrors.map((e) => (
                    <tr key={e.fingerprint}>
                      <td>
                        <span
                          className={`${styles.badge} ${e.level === 'error' ? styles.badgeError : styles.badgeWarning}`}
                        >
                          {e.level}
                        </span>
                      </td>
                      <td title={e.stack_trace ?? undefined}>{e.message}</td>
                      <td className={styles.mono}>
                        {e.method ? `${e.method} ` : ''}
                        {e.route ?? '—'}
                      </td>
                      <td>{e.source}</td>
                      <td>{e.occurrence_count}</td>
                      <td>{new Date(e.last_seen_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.grid2}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>API latency</h2>
            <p className={styles.sectionSubtitle}>Slowest routes by p95, measured on real traffic.</p>
            {performance.length === 0 ? (
              <div className={styles.emptyState}>No request metrics collected yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Requests</th>
                      <th>Avg</th>
                      <th>p95</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...performance]
                      .sort((a, b) => b.p95DurationMs - a.p95DurationMs)
                      .slice(0, 12)
                      .map((p) => (
                        <tr key={`${p.method}-${p.route}`}>
                          <td className={styles.mono}>
                            {p.method} {p.route}
                          </td>
                          <td>{p.requestCount}</td>
                          <td>{Math.round(p.avgDurationMs)}ms</td>
                          <td className={p.p95DurationMs > SLOW_ROUTE_MS ? styles.errorText : undefined}>
                            {Math.round(p.p95DurationMs)}ms
                          </td>
                          <td>{Math.round(p.errorRate * 100)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Failed operations</h2>
            <p className={styles.sectionSubtitle}>
              Requests that returned an error status, grouped by route and status code.
            </p>
            {failed.length === 0 ? (
              <div className={styles.emptyState}>No failed operations recorded.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Status</th>
                      <th>Count</th>
                      <th>Last</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failed.slice(0, 12).map((f) => (
                      <tr key={`${f.method}-${f.route}-${f.statusCode}`}>
                        <td className={styles.mono}>
                          {f.method} {f.route}
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${f.statusCode >= 500 ? styles.badgeError : styles.badgeWarning}`}
                          >
                            {f.statusCode}
                          </span>
                        </td>
                        <td>{f.occurrenceCount}</td>
                        <td>{new Date(f.lastOccurredAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>User activity</h2>
            <p className={styles.sectionSubtitle}>
              Who is actually using the platform, derived from the audit trail rather than from logins.
            </p>
            {activity.length === 0 ? (
              <div className={styles.emptyState}>No recorded activity yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Actions</th>
                      <th>Entity types</th>
                      <th>Last action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.slice(0, 12).map((a) => (
                      <tr key={a.userEmail}>
                        <td>
                          <UsersIcon size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                          {a.userEmail}
                        </td>
                        <td>{a.actionCount}</td>
                        <td>{a.distinctEntityTypes}</td>
                        <td>{new Date(a.lastActionAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Volume anomalies</h2>
            <p className={styles.sectionSubtitle}>
              Today's activity per metric against its trailing daily average — a sudden drop is as interesting as a
              spike.
            </p>
            {anomalies.length === 0 ? (
              <div className={styles.emptyState}>Not enough history to compare against yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Today</th>
                      <th>Trailing avg</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((a) => (
                      <tr key={a.metric}>
                        <td>
                          <Database size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                          {a.label}
                        </td>
                        <td>{a.todayCount}</td>
                        <td>{a.trailingDailyAverage.toFixed(1)}</td>
                        <td>
                          <span
                            className={`${styles.badge} ${a.isAnomalous ? styles.badgeWarning : styles.badgeOk}`}
                          >
                            {a.isAnomalous ? 'anomalous' : 'normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
