import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { deleteCrop, fetchCropById, fetchCropVarieties, type CropRow } from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

export default function CropDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();
  const [crop, setCrop] = useState<CropRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApprovedVariety, setHasApprovedVariety] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      setLoading(true);
      try {
        const data = await fetchCropById(token, id);
        setCrop(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load crop';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, token]);

  // Same non-blocking "Crops must have approved variety" check used on
  // CropForm — surfaced here as a read-only status, not something the
  // user can be forced to fix from this page. See CropForm.tsx for the
  // full reasoning; the same relationship is also checked, across every
  // crop at once, by the Reconcile report.
  useEffect(() => {
    if (!token || !crop?.name) {
      setHasApprovedVariety(null);
      return;
    }
    let cancelled = false;
    void fetchCropVarieties(token, { crop: crop.name, status: 'approved' })
      .then((varieties) => {
        if (!cancelled) setHasApprovedVariety(varieties.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasApprovedVariety(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, crop?.name]);

  const handleDelete = async () => {
    if (!crop || !token) return;
    const confirmed = window.confirm(`Delete ${crop.name}?`);
    if (!confirmed) return;

    try {
      await deleteCrop(token, crop.id);
      addToast('Crop deleted successfully', 'success');
      navigate('/crops');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Crop Details</h1>
          <p className={styles.subtitle}>Inspect full crop details and manage the record.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/crops')}>
            Back to list
          </Button>
          <Button leftIcon={Edit3} onClick={() => navigate(`/crops/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="danger" leftIcon={Trash2} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? <div className={styles.emptyState}>Loading crop…</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}
        {!loading && crop ? (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Name</span>
              <div className={styles.detailValue}>{crop.name}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Category</span>
              <div className={styles.detailValue}>{crop.category}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Season</span>
              <div className={styles.detailValue}>{crop.season}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <div className={styles.detailValue}>{crop.active ? 'Active' : 'Inactive'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Approved Variety</span>
              <div
                className={styles.detailValue}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {hasApprovedVariety === null ? (
                  '—'
                ) : hasApprovedVariety ? (
                  <>
                    <CheckCircle2 size={14} color="#1a7f37" /> Yes
                  </>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b8860b' }}>
                    <AlertTriangle size={14} /> None yet
                  </span>
                )}
              </div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>ID</span>
              <div className={styles.detailValue}>{crop.id}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
