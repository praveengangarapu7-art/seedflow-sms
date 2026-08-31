import { useEffect, useState } from 'react';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { deleteOrganization, fetchOrganizationById, type OrganizationRow } from '@/services/seedLotRealtimeClient';
import { organizationTypeLabel } from './organizationTypes';
import styles from './master-data.module.css';

export default function OrganizationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();
  const [organization, setOrganization] = useState<OrganizationRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      setLoading(true);
      try {
        const data = await fetchOrganizationById(token, id);
        setOrganization(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load organization';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, token]);

  const handleDelete = async () => {
    if (!organization || !token) return;
    const confirmed = window.confirm(`Delete ${organization.name}?`);
    if (!confirmed) return;

    try {
      await deleteOrganization(token, organization.id);
      addToast('Organization deleted successfully', 'success');
      navigate('/organizations');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Organization Details</h1>
          <p className={styles.subtitle}>Inspect full organization details and manage the record.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/organizations')}>
            Back to list
          </Button>
          <Button leftIcon={Edit3} onClick={() => navigate(`/organizations/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="danger" leftIcon={Trash2} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? <div className={styles.emptyState}>Loading organization…</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}
        {!loading && organization ? (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Name</span>
              <div className={styles.detailValue}>{organization.name}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Type</span>
              <div className={styles.detailValue}>{organizationTypeLabel(organization.type)}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Location</span>
              <div className={styles.detailValue}>{organization.location ?? 'Not provided.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Contact Person</span>
              <div className={styles.detailValue}>{organization.contact_person ?? 'Not provided.'}</div>
            </div>
            {organization.type === 'laboratory' ? (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Certification Type</span>
                <div className={styles.detailValue}>{organization.certification_type ?? 'Not provided.'}</div>
              </div>
            ) : null}
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <div className={styles.detailValue}>{organization.active ? 'Active' : 'Inactive'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>ID</span>
              <div className={styles.detailValue}>{organization.id}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
