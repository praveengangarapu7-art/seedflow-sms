import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { MasterDataNav } from '@/components/layout/MasterDataNav/MasterDataNav';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { runReconciliation, type ReconciliationIssue, type ReconciliationReport } from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

const entityTypeLabel: Record<ReconciliationIssue['entityType'], string> = {
  farmer: 'Farmer',
  organization: 'Lab / Organization',
  crop: 'Crop / Variety',
};

/**
 * Where a "View record" click should go. Almost every issue's entityId is
 * the id of the record named in entityType — except `variety_unknown_crop`,
 * whose entityId is actually a crop_variety id (see reconciliation.service.ts
 * on the backend: crop_varieties.crop is free text, not a foreign key, so
 * that check reports the *variety* record, not a crop record).
 */
function recordLink(issue: ReconciliationIssue): string | null {
  if (issue.entityType === 'farmer') return `/farmers/${issue.entityId}`;
  if (issue.entityType === 'organization') return `/organizations/${issue.entityId}`;
  if (issue.rule === 'variety_unknown_crop') return `/varieties/${issue.entityId}`;
  return `/crops/${issue.entityId}`;
}

/**
 * Data-integrity dashboard for Master Data: runs the backend's reconciliation
 * checks (farmer email present/valid, lab certification type present, every
 * active crop has an approved variety, no variety references an unknown
 * crop) and lists what's currently failing, with a link straight to each
 * affected record. See server/src/modules/reconciliation for the checks
 * themselves.
 */
export default function MasterDataReconcile() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (currentToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await runReconciliation(currentToken);
      setReport(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to run reconciliation';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void run(token);
  }, [token]);

  const errors = report?.issues.filter((issue) => issue.severity === 'error') ?? [];
  const warnings = report?.issues.filter((issue) => issue.severity === 'warning') ?? [];

  const renderIssue = (issue: ReconciliationIssue, index: number) => {
    const link = recordLink(issue);
    return (
      <tr key={`${issue.rule}-${issue.entityId}-${index}`} style={{ borderTop: '1px solid #e8efe8' }}>
        <td style={{ padding: '0.75rem' }}>
          {issue.severity === 'error' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#c0392b' }}>
              <XCircle size={14} /> Error
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b8860b' }}>
              <AlertTriangle size={14} /> Warning
            </span>
          )}
        </td>
        <td style={{ padding: '0.75rem' }}>{entityTypeLabel[issue.entityType]}</td>
        <td style={{ padding: '0.75rem' }}>{issue.entityName}</td>
        <td style={{ padding: '0.75rem' }}>{issue.message}</td>
        <td style={{ padding: '0.75rem' }}>
          {link ? (
            <Button size="sm" variant="secondary" onClick={() => navigate(link)}>
              View record
            </Button>
          ) : null}
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reconcile Master Data</h1>
          <p className={styles.subtitle}>
            Check Farmers, Labs, and Crops for missing or inconsistent data.
          </p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button leftIcon={RefreshCw} isLoading={loading} onClick={() => token && run(token)} disabled={!token}>
            Reconcile
          </Button>
        </div>
      </div>

      <MasterDataNav />

      <div className={styles.card}>
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {report ? (
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Records checked</span>
              <div className={styles.detailValue}>{report.totalChecked}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Errors</span>
              <div className={styles.detailValue} style={{ color: errors.length ? '#c0392b' : undefined }}>
                {errors.length}
              </div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Warnings</span>
              <div className={styles.detailValue} style={{ color: warnings.length ? '#b8860b' : undefined }}>
                {warnings.length}
              </div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Last run</span>
              <div className={styles.detailValue}>{new Date(report.generatedAt).toLocaleString()}</div>
            </div>
          </div>
        ) : null}

        {report && report.issues.length === 0 && !loading ? (
          <div className={styles.emptyState} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="#1a7f37" /> No integrity issues found — Master Data looks clean.
          </div>
        ) : null}

        {report && report.issues.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Severity</th>
                  <th style={{ padding: '0.75rem' }}>Entity</th>
                  <th style={{ padding: '0.75rem' }}>Record</th>
                  <th style={{ padding: '0.75rem' }}>Issue</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[...errors, ...warnings].map((issue, index) => renderIssue(issue, index))}
              </tbody>
            </table>
          </div>
        ) : null}

        {loading && !report ? <div className={styles.emptyState}>Running reconciliation…</div> : null}
      </div>
    </div>
  );
}
