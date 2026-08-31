import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { CropPlanningTable, type CropPlanRow } from '@/components/CropPlanningTable/CropPlanningTable';
import { masterDataApi, productionApi, type CropPlan, type Farm, type Farmer, type SeedVariety } from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import { cropPlanStatusOptions, seedCropPlans, seedFarmers, seedFarms, seedVarieties } from './cropPlanningData';
import styles from './production.module.css';

export default function CropPlanningList() {
  const [plans, setPlans] = useState<CropPlan[]>(seedCropPlans);
  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [varieties, setVarieties] = useState<SeedVariety[]>(seedVarieties);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmerFilter, setFarmerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansData, farmersData, farmsData, varietiesData] = await Promise.all([
        productionApi.getCropPlans(),
        masterDataApi.getFarmers(),
        masterDataApi.getFarms(),
        masterDataApi.getVarieties(),
      ]);
      setPlans(Array.isArray(plansData) && plansData.length > 0 ? plansData : seedCropPlans);
      setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
      setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
      setVarieties(Array.isArray(varietiesData) && varietiesData.length > 0 ? varietiesData : seedVarieties);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load crop plans';
      setError(message);
      setPlans(seedCropPlans);
      setFarmers(seedFarmers);
      setFarms(seedFarms);
      setVarieties(seedVarieties);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const rows = useMemo<CropPlanRow[]>(() => {
    return plans.map((plan) => ({
      id: plan.id,
      planCode: plan.planCode,
      farmerName: farmers.find((f) => f.id === plan.farmerId)?.name ?? 'Unknown farmer',
      farmName: farms.find((f) => f.id === plan.farmId)?.name ?? 'Unknown farm',
      varietyName: varieties.find((v) => v.id === plan.varietyId)?.name ?? 'Unknown variety',
      targetYield: plan.targetYield,
      sowingDate: plan.sowingDate,
      harvestDate: plan.harvestDate,
      status: plan.status,
    }));
  }, [plans, farmers, farms, varieties]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesFarmer = farmerFilter === 'all' || plans.find((p) => p.id === row.id)?.farmerId === farmerFilter;
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesFarmer && matchesStatus;
    });
  }, [rows, plans, farmerFilter, statusFilter]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Crop Planning</h1>
          <p className={styles.subtitle}>Plan which crop and variety each farmer grows, and track it through to harvest.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void loadData()}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/crop-planning/new')}>
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
          <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {cropPlanStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className={styles.errorText}>{error}</div> : null}

        {filteredRows.length === 0 && !loading ? (
          <div className={styles.emptyState}>No crop plans match your current filter.</div>
        ) : (
          <CropPlanningTable plans={filteredRows} loading={loading} onView={(row) => navigate(`/crop-planning/${row.id}`)} />
        )}
      </div>
    </div>
  );
}
