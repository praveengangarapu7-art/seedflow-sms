import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FlaskConical, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { labNav } from '@/config/labNav';
import { usePermission } from '@/hooks/usePermission';
import {
  fetchLabQualityFlags,
  resolveLabQualityFlag,
  type LabQualityFlag,
} from '@/services/seedLotRealtimeClient';
import { useLabSession } from './useLabSession';
import styles from './Lab.module.css';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, labToday, type PeriodValue } from '@/utils/periodFilter';

export default function QualityFlags() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, error: sessionError } = useLabSession();
  const canResolve = usePermission('resolve_lab_quality_flag');

  const [flags, setFlags] = useState<LabQualityFlag[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [activeFlag, setActiveFlag] = useState<LabQualityFlag | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const visibleFlags = useMemo(
    () => flags.filter((f) => isDateInPeriod(f.flagged_at, period, labToday())),
    [flags, period]
  );

  const load = useCallback(async (accessToken: string, resolved: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setFlags(await fetchLabQualityFlags(accessToken, { resolved }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load quality flags');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token, showResolved);
  }, [token, showResolved, load]);

  const handleResolve = async () => {
    if (!token || !activeFlag) return;
    if (!resolutionNotes.trim()) {
      addToast('Add a short note describing how this was resolved.', 'error');
      return;
    }
    setBusy(true);
    try {
      await resolveLabQualityFlag(token, activeFlag.id, resolutionNotes.trim());
      addToast('Quality flag resolved', 'success');
      setActiveFlag(null);
      setResolutionNotes('');
      await load(token, showResolved);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to resolve flag', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModuleLayout moduleName="Laboratory" moduleIcon={FlaskConical} navItems={labNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Quality Flags</h1>
            <p className={styles.subtitle}>
              Raised automatically the moment a recorded result falls below its certification threshold. Resolving one
              records who cleared it and why — it never deletes the underlying failing result.
            </p>
          </div>
          <div className={styles.controls}>
            <PeriodSelect value={period} onChange={setPeriod} />
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void load(token, showResolved)}>
              Refresh
            </Button>
          </div>
        </div>

        {sessionError && <div className={styles.card}><span className={styles.errorText}>{sessionError}</span></div>}
        {error && <div className={styles.card}><span className={styles.errorText}>{error}</span></div>}

        <div className={styles.filterBar}>
          <button className={`${styles.chip} ${!showResolved ? styles.chipActive : ''}`} onClick={() => setShowResolved(false)}>
            Open
          </button>
          <button className={`${styles.chip} ${showResolved ? styles.chipActive : ''}`} onClick={() => setShowResolved(true)}>
            Resolved
          </button>
        </div>

        <div className={styles.card}>
          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : flags.length === 0 ? (
            <div className={styles.emptyState}>
              {showResolved ? 'No resolved flags yet.' : 'No open quality flags — every tested lot is within threshold.'}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Test</th>
                    <th>Reason</th>
                    <th>Flagged</th>
                    <th>Status</th>
                    {showResolved && <th>Resolved by</th>}
                    {showResolved && <th>Resolution</th>}
                    {!showResolved && canResolve && <th />}
                  </tr>
                </thead>
                <tbody>
                  {visibleFlags.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <button className={styles.rowButton} onClick={() => navigate(`/lab/submissions/${f.submission_id}`)}>
                          {f.lot_code}
                        </button>
                      </td>
                      <td>{f.test_type}</td>
                      <td>{f.reason}</td>
                      <td>{new Date(f.flagged_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`${styles.badge} ${f.resolved ? styles.badgeResolved : styles.badgeOpen}`}>
                          {f.resolved ? 'resolved' : 'open'}
                        </span>
                      </td>
                      {showResolved && <td>{f.resolved_by ?? '—'}</td>}
                      {showResolved && <td>{f.resolution_notes ?? '—'}</td>}
                      {!showResolved && canResolve && (
                        <td>
                          <Button size="sm" variant="secondary" leftIcon={AlertTriangle} onClick={() => setActiveFlag(f)}>
                            Resolve
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal isOpen={activeFlag !== null} onClose={() => setActiveFlag(null)} title="Resolve Quality Flag">
          {activeFlag && (
            <>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Lot</span>
                  {activeFlag.lot_code}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Test</span>
                  {activeFlag.test_type}
                </div>
              </div>
              <p className={styles.sectionSubtitle}>{activeFlag.reason}</p>
              <label className={styles.label} htmlFor="resolution-notes">How was this resolved?</label>
              <textarea
                id="resolution-notes"
                className={styles.textArea}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Retest requested from the lab; original sample was contaminated in transit."
              />
              <div className={styles.formRow} style={{ marginTop: '1rem' }}>
                <Button isLoading={busy} onClick={() => void handleResolve()}>Resolve Flag</Button>
                <Button variant="secondary" onClick={() => setActiveFlag(null)}>Cancel</Button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </ModuleLayout>
  );
}
