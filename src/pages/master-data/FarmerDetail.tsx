import { useEffect, useState } from 'react';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { deleteFarmer, fetchFarmerById, fetchOrganizationById, type FarmerRow } from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
export default function FarmerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token } = useRealBackendSession();
  const [farmer, setFarmer] = useState<FarmerRow | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      setLoading(true);
      try {
        const data = await fetchFarmerById(token, id);
        setFarmer(data);
        if (data.organization_id) {
          try {
            const org = await fetchOrganizationById(token, data.organization_id);
            setOrganizationName(org.name);
          } catch {
            setOrganizationName(null);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load farmer';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, token]);

  const handleDelete = async () => {
    if (!farmer || !token) return;
    const confirmed = window.confirm(`Delete ${farmer.name}?`);
    if (!confirmed) return;

    try {
      await deleteFarmer(token, farmer.id);
      addToast('Farmer deleted successfully', 'success');
      navigate('/farmers');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Farmer Details</h1>
          <p className={styles.subtitle}>Inspect full farmer details and manage the record.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/farmers')}>
            Back to list
          </Button>
          <Button leftIcon={Edit3} onClick={() => navigate(`/farmers/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="danger" leftIcon={Trash2} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {farmer ? <RecordAiPanel recordType="master.farmer" record={farmer} label={farmer.name} /> : null}

      <div className={styles.card}>
        {loading ? <div className={styles.emptyState}>Loading farmer…</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}
        {!loading && farmer ? (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Name</span>
              <div className={styles.detailValue}>{farmer.name}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Email</span>
              <div className={styles.detailValue}>{farmer.email ?? 'Not provided.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Phone</span>
              <div className={styles.detailValue}>{farmer.phone ?? 'Not provided.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Region</span>
              <div className={styles.detailValue}>{farmer.region}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Location</span>
              <div className={styles.detailValue}>{farmer.location ?? 'Not provided.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Organization</span>
              <div className={styles.detailValue}>{organizationName ?? 'Not assigned.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>ID</span>
              <div className={styles.detailValue}>{farmer.id}</div>
            </div>
          </div>
        ) : null}
        <p className={styles.helperText} style={{ marginTop: '1rem' }}>
          Phone, location, and email are only visible to roles with full farmer data access.
        </p>
      </div>
    </div>
  );
}
