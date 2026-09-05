import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, CloudRain, FlaskConical, PackageX, RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  acknowledgeClimateRiskAlert,
  fetchClimateRiskAlerts,
  fetchExpirationStatuses,
  fetchGovernanceViolations,
  fetchLabQualityFlags,
  type ClimateRiskAlert,
  type ExpirationEntry,
  type LabQualityFlag,
  type SeedLotViolation,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * The platform alert inbox.
 *
 * Alerts in this product are raised by whichever module notices the problem —
 * the lab raises a quality flag, storage raises an expiry, climate-smart
 * raises a risk alert, governance raises a parentage violation — and each is
 * only visible on that module's own page. Someone has to be able to see all
 * of them at once, ranked by how bad they are, and that is this page.
 *
 * It deliberately does NOT invent a new alert store: every row here is a live
 * record that already exists somewhere, normalised into one severity
 * vocabulary and linked back to the page that owns it. Acknowledging a
 * climate alert is the one action available, because it is the only one of
 * the four sources with an acknowledge concept — the others are resolved by
 * fixing the underlying problem, which happens on their own pages.
 */
type Severity = 'critical' | 'warning' | 'info';

interface UnifiedAlert {
  id: string;
  severity: Severity;
  source: string;
  subject: string;
  message: string;
  raisedAt: string;
  /** Where the responsible team fixes it. */
  target: string;
  acknowledgeableId?: string;
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { token, loading: sessionLoading, error: sessionError, reload } = useAdminSession();
  const { addToast } = useToast();
  const canBroadcast = usePermission('broadcast_notification');

  const [expirations, setExpirations] = useState<ExpirationEntry[]>([]);
  const [labFlags, setLabFlags] = useState<LabQualityFlag[]>([]);
  const [climate, setClimate] = useState<ClimateRiskAlert[]>([]);
  const [violations, setViolations] = useState<SeedLotViolation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState('');

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);

    // Each source is loaded independently: a single module's endpoint being
    // unavailable must not empty the whole inbox, which is exactly the
    // situation someone would open this page during.
    const settle = async <T,>(fn: () => Promise<T>, apply: (value: T) => void) => {
      try {
        apply(await fn());
      } catch {
        /* that source contributes no rows this refresh */
      }
    };

    await Promise.all([
      settle(() => fetchExpirationStatuses(accessToken), setExpirations),
      settle(() => fetchLabQualityFlags(accessToken, { resolved: false }), setLabFlags),
      settle(() => fetchClimateRiskAlerts(accessToken, { acknowledged: false }), setClimate),
      settle(() => fetchGovernanceViolations(accessToken), setViolations),
    ]);

    setBusy(false);
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const alerts = useMemo<UnifiedAlert[]>(() => {
    const rows: UnifiedAlert[] = [];

    expirations
      .filter((e) => e.status !== 'ok')
      .forEach((e) =>
        rows.push({
          id: `exp-${e.packagingBatchId}`,
          severity: e.status === 'expired' || e.status === 'critical' ? 'critical' : 'warning',
          source: 'Storage',
          subject: `${e.lotCode} · ${e.batchCode}`,
          message:
            e.daysRemaining < 0
              ? `Expired ${Math.abs(e.daysRemaining)} days ago`
              : `${e.daysRemaining} days of shelf life remaining`,
          raisedAt: e.expirationDate,
          target: '/seed-cold-storage',
        }),
      );

    labFlags.forEach((f) =>
      rows.push({
        id: `lab-${f.id}`,
        severity: 'critical',
        source: 'Laboratory',
        subject: `${f.lot_code} · ${f.test_type}`,
        message: f.reason,
        raisedAt: f.flagged_at,
        target: '/lab/quality-flags',
      }),
    );

    climate.forEach((a) =>
      rows.push({
        id: `climate-${a.id}`,
        severity: a.risk_level === 'severe' || a.risk_level === 'high' ? 'critical' : 'warning',
        source: 'Climate',
        subject: `${a.crop} · ${a.risk_level} risk`,
        message: a.message,
        raisedAt: a.created_at,
        target: '/climate-smart-selection',
        acknowledgeableId: a.id,
      }),
    );

    violations.forEach((v) =>
      rows.push({
        id: `gov-${v.seedLotId}-${v.violationType}`,
        severity: 'warning',
        source: 'Governance',
        subject: `${v.lotCode} · ${v.violationType}`,
        message: v.description,
        raisedAt: new Date().toISOString(),
        target: '/admin/data-governance',
      }),
    );

    return rows.sort((a, b) => {
      const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (bySeverity !== 0) return bySeverity;
      return new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime();
    });
  }, [expirations, labFlags, climate, violations]);

  const visible = useMemo(
    () =>
      alerts.filter((a) => {
        if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
        if (sourceFilter && a.source !== sourceFilter) return false;
        return true;
      }),
    [alerts, severityFilter, sourceFilter],
  );

  const sourcesPresent = useMemo(() => Array.from(new Set(alerts.map((a) => a.source))).sort(), [alerts]);
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  async function handleAcknowledge(alert: UnifiedAlert) {
    if (!token || !alert.acknowledgeableId) return;
    setPendingId(alert.id);
    try {
      await acknowledgeClimateRiskAlert(token, alert.acknowledgeableId);
      addToast('Alert acknowledged.', 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to acknowledge the alert', 'error');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Alerts &amp; notifications</h1>
            <p className={styles.subtitle}>
              Every open alert on the platform in one queue — lab quality flags, stock expiry, climate risk and data
              governance — ranked by severity and linked to the team that resolves it.
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

        <div className={styles.kpiGrid}>
          <KpiCard title="Open alerts" value={String(alerts.length)} icon={Bell} />
          <KpiCard title="Critical" value={String(criticalCount)} icon={AlertTriangle} />
          <KpiCard title="Lab quality flags" value={String(labFlags.length)} icon={FlaskConical} />
          <KpiCard
            title="Stock at risk"
            value={String(expirations.filter((e) => e.status !== 'ok').length)}
            icon={PackageX}
          />
          <KpiCard title="Climate alerts" value={String(climate.length)} icon={CloudRain} />
        </div>

        {canBroadcast && (
          <div className={styles.readOnlyNotice}>
            <Bell size={16} />
            This queue reflects alerts the modules raise themselves. Outbound broadcast messaging is not wired to a
            delivery channel yet — the push-notification service currently only registers devices.
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.filterBar}>
            {(['all', 'critical', 'warning', 'info'] as const).map((s) => (
              <button
                key={s}
                className={`${styles.chip} ${severityFilter === s ? styles.chipActive : ''}`}
                onClick={() => setSeverityFilter(s)}
              >
                {s === 'all' ? 'All severities' : s}
              </button>
            ))}
            <span className={styles.spacer} />
            <select className={styles.select} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="">All sources</option>
              {sourcesPresent.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {sessionLoading || busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle2 size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
              Nothing open — no module is reporting a problem.
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Source</th>
                    <th>Subject</th>
                    <th>Detail</th>
                    <th>Raised</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            alert.severity === 'critical'
                              ? styles.badgeCritical
                              : alert.severity === 'warning'
                                ? styles.badgeWarning
                                : styles.badgeInfo
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td>{alert.source}</td>
                      <td>{alert.subject}</td>
                      <td>{alert.message}</td>
                      <td>{new Date(alert.raisedAt).toLocaleDateString()}</td>
                      <td>
                        <div className={styles.rowActions}>
                          {alert.acknowledgeableId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={CheckCircle2}
                              disabled={pendingId === alert.id}
                              onClick={() => void handleAcknowledge(alert)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => navigate(alert.target)}>
                            Resolve
                          </Button>
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
