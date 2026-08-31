import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { MasterDataNav } from '@/components/layout/MasterDataNav/MasterDataNav';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { OrganizationTable } from '@/components/OrganizationTable/OrganizationTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { deleteOrganization, fetchOrganizations, type OrganizationRow } from '@/services/seedLotRealtimeClient';
import { organizationTypeOptions } from './organizationTypes';
import styles from './master-data.module.css';

export default function OrganizationList() {
  const { accounts, accountIndex, setAccountIndex, token, loading: sessionLoading, error: sessionError } = useRealBackendSession();
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadOrganizations = async (currentToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizations(currentToken);
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load organizations';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadOrganizations(token);
  }, [token]);

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return organizations.filter((item) => {
      const matchesQuery = !query || item.name.toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [organizations, search, typeFilter]);

  const handleDelete = async (organization: OrganizationRow) => {
    if (!token) return;
    const confirmed = window.confirm(`Delete ${organization.name}?`);
    if (!confirmed) return;

    try {
      await deleteOrganization(token, organization.id);
      addToast('Organization deleted successfully', 'success');
      await loadOrganizations(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Organization Management</h1>
          <p className={styles.subtitle}>Create, edit, and manage organization master data in SeedSphere.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void loadOrganizations(token)}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/organizations/new')}>
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
              placeholder="Search by organization name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className={styles.select}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {organizationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {sessionError ? <div className={styles.errorText}>{sessionError}</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {filteredOrganizations.length === 0 && !loading && !sessionLoading ? (
          <div className={styles.emptyState}>No organizations match your current filter.</div>
        ) : (
          <OrganizationTable
            organizations={filteredOrganizations}
            loading={loading || sessionLoading}
            onView={(item) => navigate(`/organizations/${item.id}`)}
            onEdit={(item) => navigate(`/organizations/${item.id}/edit`)}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
