import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { MasterDataNav } from '@/components/layout/MasterDataNav/MasterDataNav';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { FarmerTable } from '@/components/FarmerTable/FarmerTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { deleteFarmer, fetchFarmers, fetchOrganizations, type FarmerRow } from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

export default function FarmerList() {
  const { accounts, accountIndex, setAccountIndex, token, loading: sessionLoading, error: sessionError } = useRealBackendSession();
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [organizationNames, setOrganizationNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadFarmers = async (currentToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFarmers(currentToken);
      setFarmers(Array.isArray(data) ? data : []);

      try {
        const organizations = await fetchOrganizations(currentToken);
        setOrganizationNames(Object.fromEntries(organizations.map((org) => [org.id, org.name])));
      } catch {
        // Organization names are a display nicety only — the farmer list still works without them.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load farmers';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadFarmers(token);
  }, [token]);

  const filteredFarmers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return farmers;
    return farmers.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.region ?? '').toLowerCase().includes(query) ||
        (item.email ?? '').toLowerCase().includes(query),
    );
  }, [farmers, search]);

  const handleDelete = async (farmer: FarmerRow) => {
    if (!token) return;
    const confirmed = window.confirm(`Delete ${farmer.name}?`);
    if (!confirmed) return;

    try {
      await deleteFarmer(token, farmer.id);
      addToast('Farmer deleted successfully', 'success');
      await loadFarmers(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Farmer Management</h1>
          <p className={styles.subtitle}>Create, edit, and manage farmer master data in SeedSphere.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void loadFarmers(token)}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/farmers/new')}>
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
              placeholder="Search by farmer name, region, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {sessionError ? <div className={styles.errorText}>{sessionError}</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {filteredFarmers.length === 0 && !loading && !sessionLoading ? (
          <div className={styles.emptyState}>No farmers match your current filter.</div>
        ) : (
          <FarmerTable
            farmers={filteredFarmers}
            loading={loading || sessionLoading}
            organizationNames={organizationNames}
            onView={(item) => navigate(`/farmers/${item.id}`)}
            onEdit={(item) => navigate(`/farmers/${item.id}/edit`)}
            onDelete={handleDelete}
          />
        )}

        <p className={styles.helperText} style={{ marginTop: '1rem' }}>
          Phone, location, and email are only visible to roles with full farmer data access; other roles see a masked view.
        </p>
      </div>
    </div>
  );
}
