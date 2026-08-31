import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  archiveOrphanLot,
  correctSeedLotQuantity,
  fetchCorrectionHistory,
  fetchGovernanceViolations,
  fetchOrphanLots,
  fetchReconciliationReport,
  fetchSeedLots,
  login,
  recordInventoryCount,
  type CorrectionHistoryEntry,
  type GovernanceViolationType,
  type OrphanLotEntry,
  type ReconciliationEntry,
  type RealtimeSeedLot,
  type SeedLotViolation,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedDataGovernance.module.css';

function violationClass(type: GovernanceViolationType): string {
  return (
    {
      CROP_MISMATCH: styles.violationCrop,
      STAGE_HIERARCHY: styles.violationStage,
      PRODUCTION_DATE: styles.violationDate,
      QUANTITY_LIMIT: styles.violationQuantity,
    }[type] ?? styles.violationDate
  );
}

function formatViolationType(type: GovernanceViolationType): string {
  return type.replace('_', ' ').toLowerCase();
}

export default function SeedDataGovernance() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(0); // Admin by default
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);
  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [violations, setViolations] = useState<SeedLotViolation[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationEntry[]>([]);
  const [orphans, setOrphans] = useState<OrphanLotEntry[]>([]);
  const [corrections, setCorrections] = useState<CorrectionHistoryEntry[]>([]);

  const [countLotId, setCountLotId] = useState('');
  const [countedQuantity, setCountedQuantity] = useState('');
  const [countNotes, setCountNotes] = useState('');

  const [correctLotId, setCorrectLotId] = useState('');
  const [correctQuantity, setCorrectQuantity] = useState('');
  const [correctReason, setCorrectReason] = useState('');

  const [archiveReasons, setArchiveReasons] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshReports = useCallback(async (accessToken: string) => {
    const [violationsResult, reconciliationResult, orphansResult, correctionsResult] = await Promise.all([
      fetchGovernanceViolations(accessToken),
      fetchReconciliationReport(accessToken),
      fetchOrphanLots(accessToken),
      fetchCorrectionHistory(accessToken),
    ]);
    setViolations(violationsResult);
    setReconciliation(reconciliationResult);
    setOrphans(orphansResult);
    setCorrections(correctionsResult);
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

        const lotsResult = await fetchSeedLots(accessToken);
        if (cancelled) return;
        setLots(lotsResult.filter((lot) => lot.status === 'active'));

        if (account.role === 'Admin' || account.role === 'Inspector') {
          await refreshReports(accessToken);
        } else {
          setViolations([]);
          setReconciliation([]);
          setOrphans([]);
          setCorrections([]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the governance service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const canReadReports = role === 'Admin' || role === 'Inspector';
  const canRecordCount = role === 'Admin' || role === 'Inspector' || role === 'Warehouse Manager';
  const canCorrect = role === 'Admin';

  const handleRecordCount = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) return;
    if (!countLotId) {
      setError('Select a seed lot to count.');
      return;
    }
    const quantity = Number(countedQuantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError('Counted quantity must be a non-negative number.');
      return;
    }

    setSubmitting(true);
    try {
      await recordInventoryCount(token, { seedLotId: countLotId, countedQuantity: quantity, notes: countNotes.trim() || undefined });
      addToast('Inventory count recorded', 'success');
      setCountedQuantity('');
      setCountNotes('');
      if (canReadReports) await refreshReports(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to record inventory count';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (seedLotId: string) => {
    if (!token) return;
    const reason = (archiveReasons[seedLotId] ?? '').trim();
    if (!reason) {
      setError('Enter a reason before archiving an orphan lot.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await archiveOrphanLot(token, seedLotId, reason);
      addToast('Seed lot archived as orphan', 'success');
      setArchiveReasons((prev) => ({ ...prev, [seedLotId]: '' }));
      await refreshReports(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to archive seed lot';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrect = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) return;
    if (!correctLotId) {
      setError('Select a seed lot to correct.');
      return;
    }
    const quantity = Number(correctQuantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError('Corrected quantity must be a non-negative number.');
      return;
    }
    if (!correctReason.trim()) {
      setError('A reason is required for every data correction.');
      return;
    }

    setSubmitting(true);
    try {
      await correctSeedLotQuantity(token, correctLotId, { quantityTotal: quantity, reason: correctReason.trim() });
      addToast('Seed lot quantity corrected', 'success');
      setCorrectQuantity('');
      setCorrectReason('');
      await refreshReports(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to correct seed lot quantity';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Master Data Validation &amp; Reconciliation</h1>
          <p className={styles.subtitle}>
            Parentage-rule violation scan, physical vs. recorded inventory reconciliation, orphaned-lot cleanup, and an
            audited trail for every manual correction.
          </p>
        </div>
        <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
          {DEMO_ACCOUNTS.map((account, index) => (
            <option key={account.email} value={index}>
              Viewing as: {account.role}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {!canReadReports ? (
        <div className={styles.card}>
          <span className={styles.errorText}>
            {role} cannot view governance reports — switch to Admin or Inspector to see violations, reconciliation, and
            orphan lots.
          </span>
        </div>
      ) : null}

      <div className={styles.kpiRow}>
        <KpiCard title="Rule Violations" value={String(violations.length)} icon={ShieldAlert} />
        <KpiCard title="Orphaned Lots" value={String(orphans.length)} icon={ShieldAlert} />
        <KpiCard title="Reconciled Lots" value={String(reconciliation.length)} icon={ShieldAlert} />
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Parentage Rule Violations</h2>
            <p className={styles.sectionSubtitle}>
              Crop match, stage hierarchy, production-date ordering, and the 50x multiplication-ratio ceiling — re-checked
              against every existing parent-child pair, including lots that predate these rules.
            </p>
            {violations.length === 0 ? (
              <div className={styles.emptyState}>{canReadReports ? 'No violations found.' : '—'}</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Parent</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, index) => (
                    <tr key={`${v.seedLotId}-${v.violationType}-${index}`}>
                      <td>{v.lotCode}</td>
                      <td>{v.parentLotCode}</td>
                      <td><span className={`${styles.statusBadge} ${violationClass(v.violationType)}`}>{formatViolationType(v.violationType)}</span></td>
                      <td className={styles.descriptionCell}>{v.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Inventory Reconciliation</h2>
            <p className={styles.sectionSubtitle}>Latest physical count per lot vs. the database's recorded available quantity.</p>
            {reconciliation.length === 0 ? (
              <div className={styles.emptyState}>{canReadReports ? 'No physical counts recorded yet.' : '—'}</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Counted</th>
                    <th>Recorded</th>
                    <th>Discrepancy</th>
                    <th>Counted By</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.lotCode} ({entry.crop} — {entry.variety})</td>
                      <td>{entry.countedQuantity}</td>
                      <td>{entry.recordedQuantity}</td>
                      <td className={entry.discrepancy !== 0 ? styles.discrepancyNonZero : undefined}>
                        {entry.discrepancy > 0 ? '+' : ''}
                        {entry.discrepancy}
                        {entry.discrepancyPct != null ? ` (${entry.discrepancyPct}%)` : ''}
                      </td>
                      <td>{entry.countedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Orphaned Lot Cleanup</h2>
            <p className={styles.sectionSubtitle}>
              Active lots with zero allocation, packaging, or child-lot activity for 90+ days — archive candidates.
            </p>
            {orphans.length === 0 ? (
              <div className={styles.emptyState}>{canReadReports ? 'No orphaned lots detected.' : '—'}</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Age (days)</th>
                    <th>Reason</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orphans.map((lot) => (
                    <tr key={lot.seedLotId}>
                      <td>{lot.lotCode} ({lot.crop} — {lot.variety})</td>
                      <td>{lot.daysSinceCreated}</td>
                      <td>
                        <input
                          className={styles.inlineInput}
                          placeholder="Reason for archiving…"
                          value={archiveReasons[lot.seedLotId] ?? ''}
                          onChange={(e) => setArchiveReasons((prev) => ({ ...prev, [lot.seedLotId]: e.target.value }))}
                          disabled={!canCorrect}
                        />
                      </td>
                      <td>
                        <Button type="button" isLoading={submitting} disabled={!canCorrect} onClick={() => handleArchive(lot.seedLotId)}>
                          Archive
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Correction Audit Trail</h2>
            <p className={styles.sectionSubtitle}>Every quantity correction and orphan archival, with the reason recorded.</p>
            {corrections.length === 0 ? (
              <div className={styles.emptyState}>{canReadReports ? 'No corrections recorded yet.' : '—'}</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Before → After</th>
                    <th>Reason</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.action.replace('_', ' ')}</td>
                      <td>
                        {entry.action === 'DATA_CORRECTION'
                          ? `${entry.beforeState?.quantity_total ?? '—'} → ${entry.afterState?.quantity_total ?? '—'}`
                          : `${entry.beforeState?.status ?? '—'} → ${entry.afterState?.status ?? '—'}`}
                      </td>
                      <td className={styles.descriptionCell}>{entry.metadata?.reason ?? '—'}</td>
                      <td>{entry.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Record Physical Count</h2>
            <p className={styles.sectionSubtitle}>Admin, Inspector, or Warehouse Manager.</p>
            <form className={styles.form} onSubmit={handleRecordCount}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="countLotId">Seed Lot</label>
                <select id="countLotId" className={styles.select} value={countLotId} onChange={(e) => setCountLotId(e.target.value)}>
                  <option value="">Select a lot</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.variety}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="countedQuantity">Physical Count</label>
                <Input id="countedQuantity" type="number" min="0" step="0.01" value={countedQuantity} onChange={(e) => setCountedQuantity(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="countNotes">Notes</label>
                <textarea id="countNotes" className={styles.textarea} value={countNotes} onChange={(e) => setCountNotes(e.target.value)} placeholder="Where/how the count was taken…" />
              </div>
              <Button type="submit" leftIcon={ShieldAlert} isLoading={submitting} disabled={!canRecordCount}>
                Record Count
              </Button>
              {!canRecordCount ? <span className={styles.hint}>{role} cannot submit inventory counts.</span> : null}
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Correct Seed Lot Quantity</h2>
            <p className={styles.sectionSubtitle}>Admin only — every correction is audited with the reason given.</p>
            <form className={styles.form} onSubmit={handleCorrect}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="correctLotId">Seed Lot</label>
                <select id="correctLotId" className={styles.select} value={correctLotId} onChange={(e) => setCorrectLotId(e.target.value)}>
                  <option value="">Select a lot</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.variety} (current: {lot.quantity_total})</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="correctQuantity">Corrected Quantity Total</label>
                <Input id="correctQuantity" type="number" min="0" step="0.01" value={correctQuantity} onChange={(e) => setCorrectQuantity(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="correctReason">Reason (required)</label>
                <textarea id="correctReason" className={styles.textarea} value={correctReason} onChange={(e) => setCorrectReason(e.target.value)} placeholder="Why is this correction being made?" />
              </div>
              <Button type="submit" leftIcon={ShieldAlert} isLoading={submitting} disabled={!canCorrect}>
                Correct Quantity
              </Button>
              {!canCorrect ? <span className={styles.hint}>{role} cannot correct seed lot data.</span> : null}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
