import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { MasterDataNav } from '@/components/layout/MasterDataNav/MasterDataNav';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { LabTable } from '@/components/LabTable/LabTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { deleteOrganization, fetchOrganizations, type OrganizationRow } from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

export default function LabList() {
  const { accounts, accountIndex, setAccountIndex, token, loading: sessionLoading, error: sessionError } = useRealBackendSession();
  const [labs, setLabs] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadLabs = async (currentToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizations(currentToken, { type: 'laboratory' });
      setLabs(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load labs';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadLabs(token);
  }, [token]);

  const filteredLabs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return labs;
    return labs.filter((item) => item.name.toLowerCase().includes(query));
  }, [labs, search]);

  const handleDelete = async (lab: OrganizationRow) => {
    if (!token) return;
    const confirmed = window.confirm(`Delete ${lab.name}?`);
    if (!confirmed) return;

    try {
      await deleteOrganization(token, lab.id);
      addToast('Lab deleted successfully', 'success');
      await loadLabs(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lab Management</h1>
          <p className={styles.subtitle}>Create, edit, and manage the seed testing lab directory in SeedSphere.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void loadLabs(token)}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/labs/new')}>
            Create New
          </Button>
        </div>
      </div>

      <MasterDataNav />

      <div className={styles.card}>
        <div className={styles.controls}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Search size={16} />
            <input
              className={styles.searchInput}
              placeholder="Search by lab name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {sessionError ? <div className={styles.errorText}>{sessionError}</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {filteredLabs.length === 0 && !loading && !sessionLoading ? (
          <div className={styles.emptyState}>No labs match your current filter.</div>
        ) : (
          <LabTable
            labs={filteredLabs}
            loading={loading || sessionLoading}
            onView={(item) => navigate(`/labs/${item.id}`)}
            onEdit={(item) => navigate(`/labs/${item.id}/edit`)}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
