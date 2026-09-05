import { useCallback, useEffect, useState } from 'react';
import { Archive, ExternalLink, RefreshCw, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  archiveOrphanLot,
  correctSeedLotQuantity,
  fetchCorrectionHistory,
  fetchGovernanceViolations,
  fetchOrphanLots,
  fetchReconciliationReport,
  runReconciliation,
  type CorrectionHistoryEntry,
  type OrphanLotEntry,
  type ReconciliationEntry,
  type ReconciliationReport,
  type SeedLotViolation,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * Data governance for the whole platform.
 *
 * Three independent integrity checks that all live on the same backend module
 * (server/src/modules/dataGovernance) plus the master-data reconciliation
 * scan, brought together because they are one job for one person: keeping the
 * records honest.
 *
 * Reads are Admin-OR-Inspector on the server, so a Compliance Auditor can see
 * everything here. The two write actions (archive an orphan lot, correct a
 * quantity) are Admin-only both here and there.
 */
export default function AdminDataGovernance() {
  const navigate = useNavigate();
  const { token, canAdminister, loading: sessionLoading, error: sessionError, reload } = useAdminSession();
  const { addToast } = useToast();

  const canArchive = usePermission('archive_orphan_lot');
  const canCorrect = usePermission('correct_lot_quantity');

  const [violations, setViolations] = useState<SeedLotViolation[]>([]);
  const [orphans, setOrphans] = useState<OrphanLotEntry[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationEntry[]>([]);
  const [corrections, setCorrections] = useState<CorrectionHistoryEntry[]>([]);
  const [masterDataScan, setMasterDataScan] = useState<ReconciliationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'violations' | 'orphans' | 'reconciliation' | 'corrections'>('violations');

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      const [viol, orph, recon, corr] = await Promise.all([
        fetchGovernanceViolations(accessToken),
        fetchOrphanLots(accessToken),
        fetchReconciliationReport(accessToken),
        fetchCorrectionHistory(accessToken),
      ]);
      setViolations(viol);
      setOrphans(orph);
      setReconciliation(recon);
      setCorrections(corr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load governance data');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  async function handleMasterDataScan() {
    if (!token) return;
    setPendingId('scan');
    try {
      setMasterDataScan(await runReconciliation(token));
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to run the master-data scan', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handleArchive(lot: OrphanLotEntry) {
    if (!token) return;
    const reason = window.prompt(`Why is ${lot.lotCode} being archived?`);
    if (!reason?.trim()) return;
    setPendingId(lot.seedLotId);
    try {
      await archiveOrphanLot(token, lot.seedLotId, reason.trim());
      addToast(`${lot.lotCode} archived.`, 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to archive the lot', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handleCorrect(entry: ReconciliationEntry) {
    if (!token) return;
    const reason = window.prompt(
      `Set ${entry.lotCode} to the counted quantity of ${entry.countedQuantity}? Give a reason for the correction:`,
    );
    if (!reason?.trim()) return;
    setPendingId(entry.id);
    try {
      await correctSeedLotQuantity(token, entry.seedLotId, {
        quantityTotal: entry.countedQuantity,
        reason: reason.trim(),
      });
      addToast(`${entry.lotCode} corrected to ${entry.countedQuantity}.`, 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to correct the quantity', 'error');
    } finally {
      setPendingId(null);
    }
  }

  const tabs = [
    { key: 'violations' as const, label: `Parentage violations (${violations.length})` },
    { key: 'orphans' as const, label: `Orphan lots (${orphans.length})` },
    { key: 'reconciliation' as const, label: `Count discrepancies (${reconciliation.length})` },
    { key: 'corrections' as const, label: `Correction history (${corrections.length})` },
  ];

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Data governance</h1>
            <p className={styles.subtitle}>
              Integrity checks that span modules: seed-lot parentage rules, lots with no traceable origin, physical
              counts that disagree with the ledger, and every correction ever applied.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => (token ? void load(token) : reload())}>
              Refresh
            </Button>
            <Button
              variant="secondary"
              leftIcon={Wrench}
              isLoading={pendingId === 'scan'}
              onClick={() => void handleMasterDataScan()}
            >
              Scan master data
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
            Read-only oversight session: every finding below is visible, and the archive and correct actions are not
            available.
          </div>
        )}

        <div className={styles.kpiGrid}>
          <KpiCard title="Parentage violations" value={String(violations.length)} icon={ShieldAlert} />
          <KpiCard title="Orphan lots" value={String(orphans.length)} icon={Archive} />
          <KpiCard title="Count discrepancies" value={String(reconciliation.length)} icon={Wrench} />
          <KpiCard
            title="Master-data issues"
            value={masterDataScan ? String(masterDataScan.issueCount) : '—'}
            subValue={masterDataScan ? `${masterDataScan.totalChecked} records checked` : 'run a scan'}
            icon={ShieldAlert}
          />
        </div>

        {masterDataScan && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Master-data scan</h2>
            <p className={styles.sectionSubtitle}>
              Ran {new Date(masterDataScan.generatedAt).toLocaleString()} across {masterDataScan.totalChecked} farmer,
              lab and crop records.
            </p>
            {(masterDataScan.issues ?? []).length === 0 ? (
              <div className={styles.emptyState}>No master-data issues found.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Entity</th>
                      <th>Rule</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(masterDataScan.issues ?? []).map((issue) => (
                      <tr key={`${issue.entityType}-${issue.entityId}-${issue.rule}`}>
                        <td>
                          <span
                            className={`${styles.badge} ${issue.severity === 'error' ? styles.badgeError : styles.badgeWarning}`}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td>
                          {issue.entityName} <span className={styles.muted}>({issue.entityType})</span>
                        </td>
                        <td className={styles.mono}>{issue.rule}</td>
                        <td>{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className={styles.actionRow} style={{ marginTop: '0.75rem' }}>
              <Button variant="ghost" leftIcon={ExternalLink} onClick={() => navigate('/master-data/reconcile')}>
                Open Master Data reconcile
              </Button>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.filterBar}>
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`${styles.chip} ${tab === t.key ? styles.chipActive : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : tab === 'violations' ? (
            violations.length === 0 ? (
              <div className={styles.emptyState}>
                No parentage violations — every lot's crop, stage and dates agree with its parent.
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Lot</th>
                      <th>Crop</th>
                      <th>Stage</th>
                      <th>Parent</th>
                      <th>Violation</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violations.map((v) => (
                      <tr key={`${v.seedLotId}-${v.violationType}`}>
                        <td>
                          <button
                            className={styles.rowButton}
                            onClick={() => navigate(`/seed-lot-detail/${v.seedLotId}`)}
                          >
                            {v.lotCode}
                          </button>
                        </td>
                        <td>{v.crop}</td>
                        <td>{v.stage}</td>
                        <td>{v.parentLotCode}</td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeError}`}>{v.violationType}</span>
                        </td>
                        <td>{v.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === 'orphans' ? (
            orphans.length === 0 ? (
              <div className={styles.emptyState}>No orphan lots — every lot traces back to an origin.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Lot</th>
                      <th>Crop</th>
                      <th>Variety</th>
                      <th>Stage</th>
                      <th>Status</th>
                      <th>Age</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orphans.map((o) => (
                      <tr key={o.seedLotId}>
                        <td>
                          <button
                            className={styles.rowButton}
                            onClick={() => navigate(`/seed-lot-detail/${o.seedLotId}`)}
                          >
                            {o.lotCode}
                          </button>
                        </td>
                        <td>{o.crop}</td>
                        <td>{o.variety}</td>
                        <td>{o.stage}</td>
                        <td>{o.status}</td>
                        <td>{o.daysSinceCreated} days</td>
                        <td>
                          <div className={styles.rowActions}>
                            {canArchive && canAdminister && (
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={Archive}
                                disabled={pendingId === o.seedLotId}
                                onClick={() => void handleArchive(o)}
                              >
                                Archive
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === 'reconciliation' ? (
            reconciliation.length === 0 ? (
              <div className={styles.emptyState}>
                No discrepancies — every physical count matches the recorded quantity.
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Lot</th>
                      <th>Counted</th>
                      <th>Recorded</th>
                      <th>Difference</th>
                      <th>Counted by</th>
                      <th>When</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <button className={styles.rowButton} onClick={() => navigate(`/seed-lot-detail/${r.seedLotId}`)}>
                            {r.lotCode}
                          </button>
                        </td>
                        <td>{r.countedQuantity}</td>
                        <td>{r.recordedQuantity}</td>
                        <td className={r.discrepancy !== 0 ? styles.errorText : undefined}>
                          {r.discrepancy > 0 ? '+' : ''}
                          {r.discrepancy}
                          {r.discrepancyPct !== null && ` (${r.discrepancyPct.toFixed(1)}%)`}
                        </td>
                        <td>{r.countedBy}</td>
                        <td>{new Date(r.countDate).toLocaleDateString()}</td>
                        <td>
                          <div className={styles.rowActions}>
                            {canCorrect && canAdminister && (
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={Wrench}
                                disabled={pendingId === r.id}
                                onClick={() => void handleCorrect(r)}
                              >
                                Correct to count
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : corrections.length === 0 ? (
            <div className={styles.emptyState}>No corrections have been applied.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Before</th>
                    <th>After</th>
                    <th>Reason</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((c) => (
                    <tr key={c.id}>
                      <td>{new Date(c.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeInfo}`}>{c.action}</span>
                      </td>
                      <td>{c.beforeState?.quantity_total ?? c.beforeState?.status ?? '—'}</td>
                      <td>{c.afterState?.quantity_total ?? c.afterState?.status ?? '—'}</td>
                      <td>{c.metadata?.reason ?? <span className={styles.muted}>—</span>}</td>
                      <td>{c.performedBy}</td>
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
