import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Sprout } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { CropLifecycleTracker } from '@/components/CropLifecycleTracker';
import {
  masterDataApi,
  productionApi,
  type Crop,
  type CropPlan,
  type Farm,
  type Farmer,
  type FieldInspection,
  type SeedVariety,
} from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  cropPlanStatusOptions,
  daysBetween,
  recommendedSeasonForCrop,
  seedCropPlans,
  seedCrops,
  seedFarmers,
  seedFarms,
  seedVarieties,
  statusBadgeClass,
} from './cropPlanningData';
import { seedFieldInspections } from './fieldInspectionData';
import styles from './production.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
export default function CropPlanningDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [plan, setPlan] = useState<CropPlan | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [varieties, setVarieties] = useState<SeedVariety[]>(seedVarieties);
  const [crops, setCrops] = useState<Crop[]>(seedCrops);
  const [fieldInspections, setFieldInspections] = useState<FieldInspection[]>(seedFieldInspections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [planData, farmersData, farmsData, varietiesData, cropsData, fieldInspectionsData] = await Promise.all([
          productionApi.getCropPlan(id),
          masterDataApi.getFarmers(),
          masterDataApi.getFarms(),
          masterDataApi.getVarieties(),
          masterDataApi.getCrops(),
          productionApi.getFieldInspections(),
        ]);
        setPlan(planData);
        setNextStatus(planData.status);
        setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
        setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
        setVarieties(Array.isArray(varietiesData) && varietiesData.length > 0 ? varietiesData : seedVarieties);
        setCrops(Array.isArray(cropsData) && cropsData.length > 0 ? cropsData : seedCrops);
        setFieldInspections(
          Array.isArray(fieldInspectionsData) && fieldInspectionsData.length > 0
            ? fieldInspectionsData
            : seedFieldInspections,
        );
      } catch (err) {
        const fallbackPlan = seedCropPlans.find((item) => item.id === id) ?? null;
        if (fallbackPlan) {
          setPlan(fallbackPlan);
          setNextStatus(fallbackPlan.status);
          setFarmers(seedFarmers);
          setFarms(seedFarms);
          setVarieties(seedVarieties);
          setCrops(seedCrops);
          setFieldInspections(seedFieldInspections);
        } else {
          const message = err instanceof Error ? err.message : 'Unable to load crop plan';
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const farmer = useMemo(() => farmers.find((f) => f.id === plan?.farmerId), [farmers, plan]);
  const farm = useMemo(() => farms.find((f) => f.id === plan?.farmId), [farms, plan]);
  const variety = useMemo(() => varieties.find((v) => v.id === plan?.varietyId), [varieties, plan]);
  const recommendedSeason = useMemo(
    () => (variety ? recommendedSeasonForCrop(variety.crop, crops) : undefined),
    [variety, crops],
  );
  const planFieldInspections = useMemo(
    () => fieldInspections.filter((item) => item.farmId === plan?.farmId),
    [fieldInspections, plan],
  );
  const daysToHarvest = useMemo(
    () => (plan?.sowingDate && plan?.harvestDate ? daysBetween(plan.sowingDate, plan.harvestDate) : null),
    [plan],
  );

  const handleUpdateStatus = async () => {
    if (!plan || !id || nextStatus === plan.status) return;
    setUpdatingStatus(true);
    try {
      await productionApi.updateCropPlan(id, { status: nextStatus });
      setPlan({ ...plan, status: nextStatus });
      addToast('Crop plan status updated', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update status';
      addToast(message, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Crop Plan Details</h1>
          <p className={styles.subtitle}>{plan ? plan.planCode : 'Inspect the full plan, farmer, farm and variety details.'}</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/crop-planning')}>
            Back to list
          </Button>
          <Button leftIcon={Sprout} disabled={!plan} onClick={() => navigate(`/crop-planning/${id}/lifecycle`)}>
            View Lifecycle
          </Button>
        </div>
      </div>

      {plan ? (
        <RecordAiPanel
          recordType="production.crop_plan"
          record={{ ...plan, farm, variety, farmerName: farmer?.name, fieldInspections: fieldInspections.filter((i) => i.farmId === plan.farmId) }}
          label={plan.planCode}
        />
      ) : null}

      <div className={styles.card}>
        {loading ? <div className={styles.emptyState}>Loading crop plan…</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {!loading && plan ? (
          <>
            <h2 className={styles.sectionTitle}>Status</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Current Status</span>
                <div className={styles.detailValue}>
                  <span className={`${styles.statusBadge} ${styles[statusBadgeClass(plan.status)] ?? ''}`}>{plan.status}</span>
                </div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Update Status</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select className={styles.select} value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                    {cropPlanStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    isLoading={updatingStatus}
                    disabled={nextStatus === plan.status}
                    onClick={() => void handleUpdateStatus()}
                  >
                    Update Status
                  </Button>
                </div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Farmer Info</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Farmer Name</span>
                <div className={styles.detailValue}>{farmer?.name ?? 'Unknown farmer'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Phone</span>
                <div className={styles.detailValue}>{farmer?.phone ?? 'Not provided.'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Location</span>
                <div className={styles.detailValue}>{farmer?.location ?? 'Not provided.'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>KYC Verified</span>
                <div className={styles.detailValue}>{farmer?.kycVerified ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Farm</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Farm Name</span>
                <div className={styles.detailValue}>{farm?.name ?? 'Unknown farm'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Farm Location</span>
                <div className={styles.detailValue}>{farm?.location ?? 'Not provided.'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Farm Area</span>
                <div className={styles.detailValue}>{farm?.area != null ? `${farm.area} acres` : 'Not provided.'}</div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Variety</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Variety</span>
                <div className={styles.detailValue}>{variety?.name ?? 'Unknown variety'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Crop</span>
                <div className={styles.detailValue}>{variety?.crop ?? plan.crop}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Recommended Season</span>
                <div className={styles.detailValue}>{recommendedSeason ?? plan.season ?? 'Not available'}</div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Crop Lifecycle</h2>
            <CropLifecycleTracker
              plan={plan}
              inspections={planFieldInspections}
              orientation="horizontal"
              title="Stage progress"
              showDescriptions={false}
              showInspections={false}
              onSelectStage={() => navigate(`/crop-planning/${id}/lifecycle`)}
            />

            <h2 className={styles.sectionTitle}>Timeline</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Target Yield</span>
                <div className={styles.detailValue}>{plan.targetYield != null ? `${plan.targetYield.toLocaleString()} kg` : 'Not set'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Sowing Date</span>
                <div className={styles.detailValue}>{plan.sowingDate ?? 'Not set'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Harvest Date</span>
                <div className={styles.detailValue}>{plan.harvestDate ?? 'Not set'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Days to Harvest</span>
                <div className={styles.detailValue}>{daysToHarvest !== null ? `${daysToHarvest} days` : 'Not available'}</div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
