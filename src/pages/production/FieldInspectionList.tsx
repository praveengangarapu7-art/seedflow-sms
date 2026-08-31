import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { FieldInspectionTable, type FieldInspectionGroup, type FieldInspectionRow } from '@/components/FieldInspectionTable/FieldInspectionTable';
import { masterDataApi, productionApi, type Farm, type FieldInspection } from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import { seedFarms } from './cropPlanningData';
import { cropStageOptions, seedFieldInspections } from './fieldInspectionData';
import styles from './production.module.css';

export default function FieldInspectionList() {
  const [inspections, setInspections] = useState<FieldInspection[]>(seedFieldInspections);
  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmFilter, setFarmFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inspectionsData, farmsData] = await Promise.all([
        productionApi.getFieldInspections(),
        masterDataApi.getFarms(),
      ]);
      setInspections(Array.isArray(inspectionsData) && inspectionsData.length > 0 ? inspectionsData : seedFieldInspections);
      setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load field inspections';
      setError(message);
      setInspections(seedFieldInspections);
      setFarms(seedFarms);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const rows = useMemo<FieldInspectionRow[]>(() => {
    return inspections.map((inspection) => ({
      id: inspection.id,
      inspectionCode: inspection.inspectionCode,
      farmId: inspection.farmId,
      farmName: farms.find((f) => f.id === inspection.farmId)?.name ?? 'Unknown farm',
      cropStage: inspection.cropStage,
      inspectorName: inspection.inspectorName,
      healthScore: inspection.healthScore,
      diseaseDetected: inspection.diseaseDetected,
      diseaseName: inspection.diseaseName,
      inspectionDate: inspection.inspectionDate,
    }));
  }, [inspections, farms]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesFarm = farmFilter === 'all' || row.farmId === farmFilter;
      const matchesStage = stageFilter === 'all' || row.cropStage === stageFilter;
      return matchesFarm && matchesStage;
    });
  }, [rows, farmFilter, stageFilter]);

  const groups = useMemo<FieldInspectionGroup[]>(() => {
    const byFarm = new Map<string, FieldInspectionRow[]>();
    filteredRows.forEach((row) => {
      const existing = byFarm.get(row.farmId) ?? [];
      existing.push(row);
      byFarm.set(row.farmId, existing);
    });

    return Array.from(byFarm.entries())
      .map(([farmId, groupRows]) => ({
        farmId,
        farmName: groupRows[0]?.farmName ?? 'Unknown farm',
        inspections: [...groupRows].sort((a, b) => (b.inspectionDate ?? '').localeCompare(a.inspectionDate ?? '')),
      }))
      .sort((a, b) => a.farmName.localeCompare(b.farmName));
  }, [filteredRows]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Field Inspections</h1>
          <p className={styles.subtitle}>Digital crop health inspections recorded by field inspectors, grouped by farm.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => void loadData()}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/inspections/new')}>
            New Inspection
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controls}>
          <select className={styles.select} value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)}>
            <option value="all">All farms</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">All crop stages</option>
            {cropStageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className={styles.errorText}>{error}</div> : null}

        {groups.length === 0 && !loading ? (
          <div className={styles.emptyState}>No field inspections match your current filter.</div>
        ) : (
          <FieldInspectionTable groups={groups} loading={loading} onView={(row) => navigate(`/inspections/${row.id}`)} />
        )}
      </div>
    </div>
  );
}
