import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { VarietyStatusBadge } from '@/components/VarietyTable/VarietyTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import {
  CROP_VARIETY_APPROVER_ROLES,
  approveCropVariety,
  fetchCropVarieties,
  rejectCropVariety,
  type CropVariety,
} from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

/**
 * The Admin-facing worklist of varieties waiting on a sign-off — every
 * variety currently in "reviewed" status. Approve/Reject are only wired up
 * for an Admin session; other roles can still see what's pending but the
 * action buttons are hidden (the server enforces this too — see
 * server/src/modules/cropVarieties/cropVarieties.routes.ts).
 */
export default function VarietyApprovalQueue() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token, role, loading: sessionLoading } = useRealBackendSession();
  const [queue, setQueue] = useState<CropVariety[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove = CROP_VARIETY_APPROVER_ROLES.includes(role);

  const loadQueue = async (currentToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCropVarieties(currentToken, { status: 'reviewed' });
      setQueue(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load the approval queue';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadQueue(token);
  }, [token]);

  const handleApprove = async (variety: CropVariety) => {
    if (!token) return;
    try {
      await approveCropVariety(token, variety.id);
      addToast(`${variety.name} approved`, 'success');
      await loadQueue(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to approve variety', 'error');
    }
  };

  const handleReject = async (variety: CropVariety) => {
    if (!token) return;
    const reason = window.prompt(`Reason for sending "${variety.name}" back to draft?`);
    if (!reason || !reason.trim()) return;
    try {
      await rejectCropVariety(token, variety.id, reason.trim());
      addToast(`${variety.name} sent back to draft`, 'success');
      await loadQueue(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to reject variety', 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Variety Approval Queue</h1>
          <p className={styles.subtitle}>Varieties submitted for review, waiting on an Admin decision.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/varieties')}>
            Back to varieties
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        {!canApprove && !sessionLoading ? (
          <div className={styles.helperText} style={{ marginBottom: '1rem' }}>
            You're viewing this queue as <strong>{role}</strong> — only an Admin can approve or reject from here.
          </div>
        ) : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {queue.length === 0 && !loading && !sessionLoading ? (
          <div className={styles.emptyState}>Nothing is waiting on review right now.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f9f7', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Name</th>
                  <th style={{ padding: '0.75rem' }}>Crop</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Submitted By</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((variety) => (
                  <tr key={variety.id} style={{ borderTop: '1px solid #e8efe8' }}>
                    <td style={{ padding: '0.75rem' }}>{variety.name}</td>
                    <td style={{ padding: '0.75rem' }}>{variety.crop}</td>
                    <td style={{ padding: '0.75rem' }}><VarietyStatusBadge status={variety.status} /></td>
                    <td style={{ padding: '0.75rem' }}>{variety.reviewed_by ?? variety.created_by}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/varieties/${variety.id}`)}>
                          View
                        </Button>
                        {canApprove ? (
                          <>
                            <Button size="sm" variant="primary" leftIcon={CheckCircle2} onClick={() => handleApprove(variety)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" leftIcon={XCircle} onClick={() => handleReject(variety)}>
                              Reject
                            </Button>
                          </>
                        ) : null}
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
  );
}
