import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { MasterDataNav } from '@/components/layout/MasterDataNav/MasterDataNav';
import { SeedLotTable, type SeedLotRow } from '@/components/SeedLotTable/SeedLotTable';
import { masterDataApi, type Organization, type SeedClass, type SeedLot, type SeedVariety } from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  deleteSeedLotRecord,
  getRegisterSeedLots,
  seedLotClassOptions,
  seedLotCode,
  seedLotOrganizations,
  seedLotVarieties,
} from './seedLotData';
import styles from './master-data.module.css';

export default function SeedLotRegister() {
  const [seedLots, setSeedLots] = useState<SeedLot[]>(getRegisterSeedLots());
  const [varieties, setVarieties] = useState<SeedVariety[]>(seedLotVarieties);
  const [organizations, setOrganizations] = useState<Organization[]>(seedLotOrganizations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<SeedClass | 'all'>('all');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadSeedLots = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lotsData, varietiesData, orgsData] = await Promise.all([
        masterDataApi.getSeedLots(),
        masterDataApi.getVarieties(),
        masterDataApi.getOrganizations(),
      ]);
      const nextLots = Array.isArray(lotsData) && lotsData.length > 0
        ? lotsData.filter((lot) => lot.seedClass === 'Breeder' || lot.seedClass === 'Foundation')
        : getRegisterSeedLots();
      setSeedLots(nextLots);
      setVarieties(Array.isArray(varietiesData) && varietiesData.length > 0 ? varietiesData : seedLotVarieties);
      setOrganizations(Array.isArray(orgsData) && orgsData.length > 0 ? orgsData : seedLotOrganizations);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load seed lots';
      setError(message);
      setSeedLots(getRegisterSeedLots());
      setVarieties(seedLotVarieties);
      setOrganizations(seedLotOrganizations);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSeedLots();
  }, []);

  const rows = useMemo<SeedLotRow[]>(() => {
    return seedLots.map((lot) => ({
      id: lot.id,
      lot,
      varietyName: varieties.find((v) => v.id === lot.varietyId)?.name ?? 'Unknown variety',
      sourceOrgName: organizations.find((o) => o.id === lot.sourceOrgId)?.name ?? 'Unknown organization',
      parentLotCode: lot.parentLotId ? seedLotCode({ ...lot, id: lot.parentLotId }) : undefined,
    }));
  }, [seedLots, varieties, organizations]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !query || row.varietyName.toLowerCase().includes(query) || row.sourceOrgName.toLowerCase().includes(query);
      const matchesClass = classFilter === 'all' || row.lot.seedClass === classFilter;
      return matchesQuery && matchesClass;
    });
  }, [rows, search, classFilter]);

  const handleDelete = async (row: SeedLotRow) => {
    const confirmed = window.confirm(`Delete seed lot ${seedLotCode(row.lot)} (${row.varietyName})?`);
    if (!confirmed) return;

    try {
      await masterDataApi.deleteSeedLot(row.lot.id);
      addToast('Seed lot deleted successfully', 'success');
      await loadSeedLots();
    } catch {
      // No backend connected in this scaffold — fall back to the local session store.
      deleteSeedLotRecord(row.lot.id);
      setSeedLots(getRegisterSeedLots());
      addToast('Seed lot deleted (offline mode — no backend connected)', 'info');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seed Lot Register</h1>
          <p className={styles.subtitle}>
            Track Breeder and Foundation seed lots, their source organization, and remaining quantity — this is what Crop
            Planning allocates its parent seed from.
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void loadSeedLots()}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/seed-lots/new')}>
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
              placeholder="Search by variety or source organization"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className={styles.select}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value as SeedClass | 'all')}
          >
            <option value="all">All seed classes</option>
            {seedLotClassOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className={styles.errorText}>{error}</div> : null}

        {filteredRows.length === 0 && !loading ? (
          <div className={styles.emptyState}>No seed lots match your current filter.</div>
        ) : (
          <SeedLotTable
            rows={filteredRows}
            loading={loading}
            onEdit={(row) => navigate(`/seed-lots/${row.lot.id}/edit`)}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
