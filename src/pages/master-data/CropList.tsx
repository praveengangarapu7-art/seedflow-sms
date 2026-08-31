import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { MasterDataNav } from '@/components/layout/MasterDataNav/MasterDataNav';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { CropTable } from '@/components/CropTable/CropTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import { deleteCrop, fetchCropVarieties, fetchCrops, type CropRow } from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

export default function CropList() {
  const { accounts, accountIndex, setAccountIndex, token, loading: sessionLoading, error: sessionError } = useRealBackendSession();
  const [crops, setCrops] = useState<CropRow[]>([]);
  const [cropsWithApprovedVariety, setCropsWithApprovedVariety] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadCrops = async (currentToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCrops(currentToken);
      setCrops(Array.isArray(data) ? data : []);

      try {
        const approvedVarieties = await fetchCropVarieties(currentToken, { status: 'approved' });
        setCropsWithApprovedVariety(new Set(approvedVarieties.map((v) => v.crop)));
      } catch {
        // The "has an approved variety" indicator is a nicety — the crop list still works without it.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load crops';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadCrops(token);
  }, [token]);

  const filteredCrops = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return crops;
    return crops.filter((item) => item.name.toLowerCase().includes(query));
  }, [crops, search]);

  const handleDelete = async (crop: CropRow) => {
    if (!token) return;
    const confirmed = window.confirm(`Delete ${crop.name}?`);
    if (!confirmed) return;

    try {
      await deleteCrop(token, crop.id);
      addToast('Crop deleted successfully', 'success');
      await loadCrops(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Crop Management</h1>
          <p className={styles.subtitle}>Create, edit, and manage crop master data in SeedSphere.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void loadCrops(token)}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/crops/new')}>
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
              placeholder="Search by crop name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {sessionError ? <div className={styles.errorText}>{sessionError}</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {filteredCrops.length === 0 && !loading && !sessionLoading ? (
          <div className={styles.emptyState}>No crops match your current filter.</div>
        ) : (
          <CropTable
            crops={filteredCrops}
            loading={loading || sessionLoading}
            cropsWithApprovedVariety={cropsWithApprovedVariety}
            onView={(item) => navigate(`/crops/${item.id}`)}
            onEdit={(item) => navigate(`/crops/${item.id}/edit`)}
            onDelete={handleDelete}
          />
        )}

        <p className={styles.helperText} style={{ marginTop: '1rem' }}>
          "Approved Variety" flags active crops with no approved variety yet — run Reconcile from the Master Data nav for the full integrity report.
        </p>
      </div>
    </div>
  );
}
