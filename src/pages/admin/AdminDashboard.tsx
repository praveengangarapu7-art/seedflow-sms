import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  FlaskConical,
  GitBranch,
  Microscope,
  RefreshCw,
  Sprout,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Users as UsersIcon,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import {
  fetchAdminUserStats,
  fetchAuditLogs,
  fetchDataConsistency,
  fetchErrorLogs,
  fetchGovernanceViolations,
  fetchLabQualityFlags,
  fetchOrganizations,
  listWorkflows,
  type AdminUserStats,
  type AuditLogRow,
  type DataConsistencySummary,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

// Each tile below reads directly from the same data the owning module's own
// dashboard renders from — mock today, the module's real API once one
// exists — rather than a separate copy kept in step by hand. That is the
// difference between "Administration shows numbers" and "Administration is
// actually a control room": open Procurement's Dashboard and its count here
// will always match, because it is the same import.
import { mockPOs } from '@/pages/procurement/mockData/ordersData';
import { mockPRs } from '@/pages/procurement/mockData/requisitionsData';
import { dashboardKpis as warehouseKpis } from '@/pages/warehouse/mockData/dashboardData';
import { rdKpis } from '@/pages/rd/mockData/dashboardData';
import { batches as processingBatches } from '@/data/processing/batches';
import { plants as processingPlants } from '@/data/processing/plants';
import { seedCropPlans, seedFarmers } from '@/pages/production/cropPlanningData';
import { DEMO_LAB_SUBMISSIONS, DEMO_QUALITY_FLAGS } from '@/services/demoData';

interface ModuleSnapshot {
  key: string;
  label: string;
  path: string;
  icon: typeof ShoppingCart;
  metrics: { label: string; value: string }[];
}

const pendingRequisitionCount = mockPRs.filter((pr) =>
  ['pending', 'pending approval'].includes(pr.status.toLowerCase()),
).length;
const activeProcessingBatchCount = processingBatches.filter((b) => b.status !== 'Completed').length;
const openLabFlagCount = DEMO_QUALITY_FLAGS.filter((f) => !f.resolved).length;
const activeCropPlanCount = seedCropPlans.filter((p) => p.status !== 'Cancelled' && p.status !== 'Harvested').length;
const warehouseFulfillment = warehouseKpis.find((k) => k.label === 'Order fulfillment rate');
const warehouseSkus = warehouseKpis.find((k) => k.label === 'Active SKUs');

const MODULE_SNAPSHOTS: ModuleSnapshot[] = [
  {
    key: 'procurement',
    label: 'Procurement',
    path: '/procurement/dashboard',
    icon: ShoppingCart,
    metrics: [
      { label: 'Purchase orders', value: String(mockPOs.length) },
      { label: 'Pending requisitions', value: String(pendingRequisitionCount) },
    ],
  },
  {
    key: 'warehouse',
    label: 'Warehouse',
    path: '/warehouse/dashboard',
    icon: WarehouseIcon,
    metrics: [
      { label: 'Order fulfillment', value: warehouseFulfillment?.value ?? '—' },
      { label: 'Active SKUs', value: warehouseSkus?.value ?? '—' },
    ],
  },
  {
    key: 'processing',
    label: 'Processing',
    path: '/processing/dashboard',
    icon: Activity,
    metrics: [
      { label: 'Batches in production', value: String(activeProcessingBatchCount) },
      { label: 'Plants', value: String(processingPlants.length) },
    ],
  },
  {
    key: 'rd',
    label: 'Research & Development',
    path: '/rd/dashboard',
    icon: FlaskConical,
    metrics: [
      { label: rdKpis[0]?.label ?? 'Breeding programs', value: rdKpis[0]?.value ?? '—' },
      { label: rdKpis[1]?.label ?? 'Trials in progress', value: rdKpis[1]?.value ?? '—' },
    ],
  },
  {
    key: 'production',
    label: 'Production Planning',
    path: '/production/dashboard',
    icon: Sprout,
    metrics: [
      { label: 'Crop plans in season', value: String(activeCropPlanCount) },
      { label: 'Registered farmers', value: String(seedFarmers.length) },
    ],
  },
  {
    key: 'lab',
    label: 'Laboratory',
    path: '/lab/dashboard',
    icon: Microscope,
    metrics: [
      { label: 'Samples submitted', value: String(DEMO_LAB_SUBMISSIONS.length) },
      { label: 'Open quality flags', value: String(openLabFlagCount) },
    ],
  },
];

/**
 * The Administration landing page answers one question: "is anything wrong
 * anywhere on the platform right now?" Every number here is a live count
 * from the module that owns it — this page owns none of the data and stores
 * nothing of its own.
 *
 * A Compliance Auditor's backend session (Inspector) cannot read /users or
 * /monitoring, so those two tiles show "—" rather than an error. That is why
 * each source is fetched independently instead of in one Promise.all: one
 * refused endpoint must not blank the whole dashboard.
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { token, canAdminister, loading: sessionLoading, error: sessionError, reload } = useAdminSession();

  const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [violationCount, setViolationCount] = useState<number | null>(null);
  const [labFlagCount, setLabFlagCount] = useState<number | null>(null);
  const [activeWorkflows, setActiveWorkflows] = useState<number | null>(null);
  const [errorCount, setErrorCount] = useState<number | null>(null);
  const [consistency, setConsistency] = useState<DataConsistencySummary | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditLogRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (accessToken: string) => {
      setBusy(true);

      // Independent, best-effort loads: a 403 on an Admin-only endpoint for a
      // Compliance Auditor leaves that tile empty and the rest intact.
      const settle = async <T,>(fn: () => Promise<T>, apply: (value: T) => void) => {
        try {
          apply(await fn());
        } catch {
          /* tile stays empty — see the note in this file's header */
        }
      };

      await Promise.all([
        settle(() => fetchAuditLogs(accessToken, { limit: 12 }), setRecentAudit),
        settle(() => fetchOrganizations(accessToken), (rows) => setOrgCount(rows.length)),
        settle(() => fetchGovernanceViolations(accessToken), (rows) => setViolationCount(rows.length)),
        settle(() => fetchLabQualityFlags(accessToken, { resolved: false }), (rows) => setLabFlagCount(rows.length)),
        settle(
          () => listWorkflows(accessToken, { status: 'in_progress' }),
          (rows) => setActiveWorkflows(rows.length),
        ),
        ...(canAdminister
          ? [
              settle(() => fetchAdminUserStats(accessToken), setUserStats),
              settle(() => fetchErrorLogs(accessToken), (rows) => setErrorCount(rows.length)),
              settle(() => fetchDataConsistency(accessToken), setConsistency),
            ]
          : []),
      ]);

      setBusy(false);
    },
    [canAdminister],
  );

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const openIssues =
    (violationCount ?? 0) +
    (labFlagCount ?? 0) +
    (consistency ? consistency.orphanLotCount + consistency.reconciliationDiscrepancyCount : 0);

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Administration</h1>
            <p className={styles.subtitle}>
              One control room for the concerns every module shares — accounts and roles, the platform audit trail,
              system health, data governance, privacy and retention, cross-module approvals and module availability.
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

        {!sessionLoading && !canAdminister && (
          <div className={styles.readOnlyNotice}>
            <ShieldCheck size={16} />
            Read-only oversight session. Account, health and privacy figures are withheld from this role by the server,
            not merely hidden here.
          </div>
        )}

        <div className={styles.kpiGrid}>
          <KpiCard
            title="User accounts"
            value={userStats ? String(userStats.total) : '—'}
            subValue={userStats ? `${userStats.active} active · ${userStats.inactive} disabled` : undefined}
            icon={UsersIcon}
          />
          <KpiCard title="Organizations" value={orgCount === null ? '—' : String(orgCount)} icon={Building2} />
          <KpiCard
            title="Open data issues"
            value={violationCount === null && labFlagCount === null ? '—' : String(openIssues)}
            subValue={
              violationCount !== null || labFlagCount !== null
                ? `${violationCount ?? 0} governance · ${labFlagCount ?? 0} lab flags`
                : undefined
            }
            icon={AlertTriangle}
          />
          <KpiCard
            title="Workflows in progress"
            value={activeWorkflows === null ? '—' : String(activeWorkflows)}
            icon={GitBranch}
          />
          <KpiCard
            title="Error groups"
            value={errorCount === null ? '—' : String(errorCount)}
            subValue={canAdminister ? 'distinct backend + frontend faults' : undefined}
            icon={Activity}
          />
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Modules at a glance</h2>
          <p className={styles.sectionSubtitle}>
            One live number from each module's own dashboard — the same records, not a separate copy.
          </p>
          <div className={styles.moduleSnapshotGrid}>
            {MODULE_SNAPSHOTS.map((mod) => (
              <button
                key={mod.key}
                type="button"
                className={styles.moduleCard}
                onClick={() => navigate(mod.path)}
              >
                <div className={styles.moduleCardHeader}>
                  <span className={styles.moduleIconWrap}>
                    <mod.icon size={16} />
                  </span>
                  <span className={styles.moduleCardTitle}>{mod.label}</span>
                  <ArrowUpRight size={14} className={styles.moduleLinkIcon} />
                </div>
                <div className={styles.metaGrid}>
                  {mod.metrics.map((metric) => (
                    <div key={metric.label} className={styles.metaItem}>
                      <span className={styles.metaLabel}>{metric.label}</span>
                      <span className={styles.moduleMetricValue}>{metric.value}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Recent platform activity</h2>
            <p className={styles.sectionSubtitle}>
              The newest entries in the audit trail, across every entity type in the system.
            </p>
            {sessionLoading || busy ? (
              <div className={styles.emptyState}>Loading…</div>
            ) : recentAudit.length === 0 ? (
              <div className={styles.emptyState}>No audit entries recorded yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAudit.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeInfo}`}>{row.action}</span>
                        </td>
                        <td className={styles.mono}>{row.entity_type}</td>
                        <td>{row.performed_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className={styles.actionRow} style={{ marginTop: '0.75rem' }}>
              <Button variant="ghost" leftIcon={ScrollText} onClick={() => navigate('/admin/audit-logs')}>
                Open full audit trail
              </Button>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Accounts by backend role</h2>
            <p className={styles.sectionSubtitle}>
              How the platform's real authorisation roles are distributed. The richer per-module roles used by the app
              shell map onto these — see Roles &amp; permissions.
            </p>
            {!userStats ? (
              <div className={styles.emptyState}>
                {canAdminister ? 'No user records available.' : 'Withheld from a read-only session.'}
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Accounts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(userStats.byRole ?? []).map((entry) => (
                      <tr key={entry.role}>
                        <td>{entry.role}</td>
                        <td>{entry.count}</td>
                      </tr>
                    ))}
                    {userStats.withoutOrganization > 0 && (
                      <tr>
                        <td className={styles.muted}>Not linked to an organization</td>
                        <td>{userStats.withoutOrganization}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className={styles.actionRow} style={{ marginTop: '0.75rem' }}>
              <Button variant="ghost" leftIcon={UsersIcon} onClick={() => navigate('/admin/users')}>
                Manage users
              </Button>
            </div>
          </div>
        </div>

        {consistency && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Data consistency</h2>
            <p className={styles.sectionSubtitle}>
              Cross-checks that run against the whole seed-lot graph rather than one module's records.
            </p>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Parentage violations</span>
                <span>{consistency.parentageViolationCount}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Reconciliation discrepancies</span>
                <span>{consistency.reconciliationDiscrepancyCount}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Orphan lots</span>
                <span>{consistency.orphanLotCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
