import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { FarmTable, type FarmRow } from '@/components/FarmTable/FarmTable';
import { masterDataApi, type Farm, type Farmer } from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import { seedFarmers, seedFarms } from './cropPlanningData';
import styles from './production.module.css';

export default function FarmList() {
  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmerFilter, setFarmerFilter] = useState('all');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [farmsData, farmersData] = await Promise.all([masterDataApi.getFarms(), masterDataApi.getFarmers()]);
      setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
      setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load farms';
      setError(message);
      setFarms(seedFarms);
      setFarmers(seedFarmers);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const rows = useMemo<FarmRow[]>(
    () =>
      farms.map((farm) => ({
        id: farm.id,
        farmerId: farm.farmerId,
        farmerName: farmers.find((f) => f.id === farm.farmerId)?.name ?? 'Unknown farmer',
        crop: farm.currentCrop ?? 'Not planted',
        area: farm.area,
        location: farm.location,
        soilType: farm.soilType ?? '—',
      })),
    [farms, farmers],
  );

  const filteredRows = useMemo(() => {
    if (farmerFilter === 'all') return rows;
    return rows.filter((row) => row.farmerId === farmerFilter);
  }, [rows, farmerFilter]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Farm Management</h1>
          <p className={styles.subtitle}>Register farms, link them to farmers, and track field inspections.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void loadData()}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/farms/new')}>
            Create New
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controls}>
          <select className={styles.select} value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)}>
            <option value="all">All farmers</option>
            {farmers.map((farmer) => (
              <option key={farmer.id} value={farmer.id}>
                {farmer.name}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className={styles.errorText}>{error}</div> : null}

        {filteredRows.length === 0 && !loading ? (
          <div className={styles.emptyState}>No farms match your current filter.</div>
        ) : (
          <FarmTable
            farms={filteredRows}
            loading={loading}
            onView={(row) => navigate(`/farms/${row.id}`)}
            onViewInspections={(row) => navigate(`/farms/${row.id}/inspections`)}
          />
        )}
      </div>
    </div>
  );
}
