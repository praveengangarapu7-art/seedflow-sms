import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  fetchApiPerformance,
  fetchAnomalies,
  fetchDataConsistency,
  fetchErrorLogs,
  fetchFailedOperations,
  fetchUserActivity,
  getOfflineQueueSize,
  login,
  syncOfflineQueue,
  type AnomalyEntry,
  type ApiPerformanceEntry,
  type DataConsistencySummary,
  type ErrorLogGroup,
  type FailedOperationEntry,
  type UserActivityEntry,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedMonitoringDashboard.module.css';

export default function SeedMonitoringDashboard() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);

  const [errorLogs, setErrorLogs] = useState<ErrorLogGroup[]>([]);
  const [apiPerformance, setApiPerformance] = useState<ApiPerformanceEntry[]>([]);
  const [failedOps, setFailedOps] = useState<FailedOperationEntry[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityEntry[]>([]);
  const [dataConsistency, setDataConsistency] = useState<DataConsistencySummary | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyEntry[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const loadAll = useCallback(async (accessToken: string) => {
    setError(null);
    setForbidden(false);
    try {
      const [errors, perf, failed, activity, consistency, anomalyList] = await Promise.all([
        fetchErrorLogs(accessToken),
        fetchApiPerformance(accessToken),
        fetchFailedOperations(accessToken),
        fetchUserActivity(accessToken),
        fetchDataConsistency(accessToken),
        fetchAnomalies(accessToken),
      ]);
      setErrorLogs(errors);
      setApiPerformance(perf);
      setFailedOps(failed);
      setUserActivity(activity);
      setDataConsistency(consistency);
      setAnomalies(anomalyList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load monitoring data';
      if (message.includes('requires one of these roles')) setForbidden(true);
      else setError(message);
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
        setRole(account.role);
        setQueueSize(getOfflineQueueSize());
        await loadAll(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the monitoring service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleRefresh = () => {
    if (token) void loadAll(token);
    setQueueSize(getOfflineQueueSize());
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      setQueueSize(getOfflineQueueSize());
      setError(null);
      if (result.succeeded === 0 && result.failed === 0 && result.stillOffline === 0) {
        setError('Queue is empty — nothing to sync.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const anomalyCount = anomalies.filter((a) => a.isAnomalous).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Error Handling &amp; Monitoring</h1>
          <p className={styles.subtitle}>
            API performance, failed operations, data inconsistencies, user activity, and business-metric anomalies —
            plus the offline-sync queue every real-backend page in this app now feeds into automatically when the
            network drops.
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
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}

      {forbidden ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>{role} cannot view the monitoring dashboard — Admin only.</div>
        </div>
      ) : (
        <>
          <div className={styles.kpiRow}>
            <KpiCard title="Distinct Error Types" value={String(errorLogs.length)} icon={AlertTriangle} />
            <KpiCard title="Active Anomalies" value={String(anomalyCount)} icon={AlertTriangle} />
            <KpiCard title="Failed Operation Routes" value={String(failedOps.length)} icon={AlertTriangle} />
            <KpiCard title="Offline Queue" value={String(queueSize)} icon={WifiOff} />
          </div>

          <div className={styles.card}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.sectionTitle}>Offline Sync Queue</h2>
              <Button size="sm" isLoading={syncing} onClick={() => void handleSyncNow()}>Sync Now</Button>
            </div>
            <p className={styles.sectionSubtitle}>
              {queueSize === 0
                ? 'No actions waiting to sync. Mutating requests made while offline are queued here automatically and replayed when the connection returns.'
                : `${queueSize} action(s) made while offline are waiting to sync.`}
            </p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Business Metric Anomalies</h2>
            <table className={styles.table}>
              <thead>
                <tr><th>Metric</th><th>Today</th><th>7-day Avg</th><th>Status</th></tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr key={a.metric}>
                    <td>{a.label}</td>
                    <td>{a.todayCount}</td>
                    <td>{a.trailingDailyAverage}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${a.isAnomalous ? styles.statusAnomalous : styles.statusNormal}`}>
                        {a.isAnomalous ? 'Anomalous — alert sent' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Data Consistency</h2>
            {dataConsistency ? (
              <div className={styles.kpiRow}>
                <KpiCard title="Parentage Rule Violations" value={String(dataConsistency.parentageViolationCount)} icon={AlertTriangle} />
                <KpiCard title="Reconciliation Discrepancies" value={String(dataConsistency.reconciliationDiscrepancyCount)} icon={AlertTriangle} />
                <KpiCard title="Orphaned Lots" value={String(dataConsistency.orphanLotCount)} icon={AlertTriangle} />
              </div>
            ) : null}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>API Performance (last 24h)</h2>
            {apiPerformance.length === 0 ? (
              <div className={styles.emptyState}>No requests recorded yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>Method</th><th>Route</th><th>Requests</th><th>Avg</th><th>P95</th><th>Error Rate</th></tr>
                </thead>
                <tbody>
                  {apiPerformance.map((row, i) => (
                    <tr key={`${row.method}-${row.route}-${i}`}>
                      <td>{row.method}</td>
                      <td className={styles.routeCell}>{row.route}</td>
                      <td>{row.requestCount}</td>
                      <td>{row.avgDurationMs}ms</td>
                      <td>{row.p95DurationMs}ms</td>
                      <td className={row.errorRate > 0 ? styles.errorCell : undefined}>{row.errorRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Failed Operations (last 24h)</h2>
            {failedOps.length === 0 ? (
              <div className={styles.emptyState}>No failed requests recorded.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>Method</th><th>Route</th><th>Status</th><th>Count</th><th>Last Occurred</th></tr>
                </thead>
                <tbody>
                  {failedOps.map((row, i) => (
                    <tr key={`${row.method}-${row.route}-${row.statusCode}-${i}`}>
                      <td>{row.method}</td>
                      <td className={styles.routeCell}>{row.route}</td>
                      <td>{row.statusCode}</td>
                      <td>{row.occurrenceCount}</td>
                      <td>{new Date(row.lastOccurredAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>User Activity (last 24h)</h2>
            {userActivity.length === 0 ? (
              <div className={styles.emptyState}>No user activity recorded.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>User</th><th>Actions</th><th>Entity Types Touched</th><th>Last Action</th></tr>
                </thead>
                <tbody>
                  {userActivity.map((row) => (
                    <tr key={row.userEmail}>
                      <td>{row.userEmail}</td>
                      <td>{row.actionCount}</td>
                      <td>{row.distinctEntityTypes}</td>
                      <td>{new Date(row.lastActionAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Error Log (aggregated)</h2>
            {errorLogs.length === 0 ? (
              <div className={styles.emptyState}>No errors logged yet.</div>
            ) : (
              errorLogs.map((log) => (
                <div key={log.fingerprint} className={styles.errorRow}>
                  <div className={styles.errorRowHeader}>
                    <span className={`${styles.statusBadge} ${log.source === 'backend' ? styles.statusBackend : styles.statusFrontend}`}>
                      {log.source}
                    </span>
                    <strong>{log.message}</strong>
                    <span className={styles.occurrenceBadge}>×{log.occurrence_count}</span>
                  </div>
                  <div className={styles.rowMeta}>
                    {log.route ? `${log.method ?? ''} ${log.route} · ` : ''}
                    first seen {new Date(log.first_seen_at).toLocaleString()} · last seen {new Date(log.last_seen_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
