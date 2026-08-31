import { useEffect, useState } from 'react';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { deleteOrganization, fetchOrganizationById, type OrganizationRow } from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

export default function LabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();
  const [lab, setLab] = useState<OrganizationRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      setLoading(true);
      try {
        const data = await fetchOrganizationById(token, id);
        setLab(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load lab';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, token]);

  const handleDelete = async () => {
    if (!lab || !token) return;
    const confirmed = window.confirm(`Delete ${lab.name}?`);
    if (!confirmed) return;

    try {
      await deleteOrganization(token, lab.id);
      addToast('Lab deleted successfully', 'success');
      navigate('/labs');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lab Details</h1>
          <p className={styles.subtitle}>Inspect full lab details and manage the record.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/labs')}>
            Back to list
          </Button>
          <Button leftIcon={Edit3} onClick={() => navigate(`/labs/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="danger" leftIcon={Trash2} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? <div className={styles.emptyState}>Loading lab…</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}
        {!loading && lab ? (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Name</span>
              <div className={styles.detailValue}>{lab.name}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Location</span>
              <div className={styles.detailValue}>{lab.location ?? 'Not provided.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Contact Person</span>
              <div className={styles.detailValue}>{lab.contact_person ?? 'Not provided.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Certification Type</span>
              <div className={styles.detailValue}>{lab.certification_type ?? 'Not provided.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <div className={styles.detailValue}>{lab.active ? 'Active' : 'Inactive'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>ID</span>
              <div className={styles.detailValue}>{lab.id}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
