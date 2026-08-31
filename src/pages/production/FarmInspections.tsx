import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { InspectionTable } from '@/components/InspectionTable/InspectionTable';
import { masterDataApi, productionApi, type Farm, type InspectionRecord } from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import { seedFarms } from './cropPlanningData';
import { seedInspections } from './farmManagementData';
import styles from './production.module.css';

export default function FarmInspections() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [farm, setFarm] = useState<Farm | null>(null);
  const [inspections, setInspections] = useState<InspectionRecord[]>(seedInspections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [farmData, inspectionsData] = await Promise.all([masterDataApi.getFarm(id), productionApi.getInspections()]);
      setFarm(farmData);
      setInspections(Array.isArray(inspectionsData) && inspectionsData.length > 0 ? inspectionsData : seedInspections);
    } catch (err) {
      const fallbackFarm = seedFarms.find((item) => item.id === id) ?? null;
      setFarm(fallbackFarm);
      setInspections(seedInspections);
      if (!fallbackFarm) {
        const message = err instanceof Error ? err.message : 'Unable to load inspections';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const farmInspections = useMemo(() => inspections.filter((item) => item.farmId === id), [inspections, id]);

  const handleApprove = async (inspection: InspectionRecord) => {
    setApprovingId(inspection.id);
    try {
      await productionApi.approveInspection(inspection.id);
      setInspections((prev) => prev.map((item) => (item.id === inspection.id ? { ...item, status: 'Approved' } : item)));
      addToast('Inspection approved', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to approve inspection';
      addToast(message, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{farm ? `Inspections — ${farm.name}` : 'Farm Inspections'}</h1>
          <p className={styles.subtitle}>Field inspection history for this farm.</p>
        </div>
        <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate(`/farms/${id}`)}>
          Back to farm
        </Button>
      </div>

      <div className={styles.card}>
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {farmInspections.length === 0 && !loading ? (
          <div className={styles.emptyState}>No inspections recorded for this farm yet.</div>
        ) : (
          <InspectionTable inspections={farmInspections} loading={loading} approvingId={approvingId} onApprove={handleApprove} />
        )}
      </div>
    </div>
  );
}
