import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, MapPin, Sprout } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { masterDataApi, productionApi, type CropPlan, type Farm, type Farmer, type InspectionRecord } from '@/services/api';
import { seedCropPlans, seedFarmers, seedFarms, statusBadgeClass } from './cropPlanningData';
import { googleMapsUrl, parseGpsCoordinates, seedInspections } from './farmManagementData';
import styles from './production.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
export default function FarmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [farm, setFarm] = useState<Farm | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [cropPlans, setCropPlans] = useState<CropPlan[]>(seedCropPlans);
  const [inspections, setInspections] = useState<InspectionRecord[]>(seedInspections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [farmData, farmersData, cropPlansData, inspectionsData] = await Promise.all([
          masterDataApi.getFarm(id),
          masterDataApi.getFarmers(),
          productionApi.getCropPlans(),
          productionApi.getInspections(),
        ]);
        setFarm(farmData);
        setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
        setCropPlans(Array.isArray(cropPlansData) && cropPlansData.length > 0 ? cropPlansData : seedCropPlans);
        setInspections(Array.isArray(inspectionsData) && inspectionsData.length > 0 ? inspectionsData : seedInspections);
      } catch (err) {
        const fallbackFarm = seedFarms.find((item) => item.id === id) ?? null;
        if (fallbackFarm) {
          setFarm(fallbackFarm);
          setFarmers(seedFarmers);
          setCropPlans(seedCropPlans);
          setInspections(seedInspections);
        } else {
          const message = err instanceof Error ? err.message : 'Unable to load farm';
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const farmer = useMemo(() => farmers.find((f) => f.id === farm?.farmerId), [farmers, farm]);
  const farmCropPlans = useMemo(() => cropPlans.filter((plan) => plan.farmId === id), [cropPlans, id]);
  const farmInspections = useMemo(() => inspections.filter((item) => item.farmId === id), [inspections, id]);
  const gpsPoint = useMemo(() => parseGpsCoordinates(farm?.gpsCoordinates), [farm]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{farm ? farm.name : 'Farm Details'}</h1>
          <p className={styles.subtitle}>Full farm profile, linked farmer, crop plan, and inspection history.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/farms')}>
            Back to list
          </Button>
          <Button variant="secondary" leftIcon={Sprout} onClick={() => navigate(`/farms/${id}/lifecycle`)}>
            Crop Lifecycle
          </Button>
          <Button leftIcon={ClipboardList} onClick={() => navigate(`/farms/${id}/inspections`)}>
            View Inspections
          </Button>
        </div>
      </div>

      {farm ? <RecordAiPanel recordType="production.farm" record={{ ...farm, inspections: inspections.filter((i) => i.farmId === farm.id) }} label={farm.name} /> : null}

      <div className={styles.card}>
        {loading ? <div className={styles.emptyState}>Loading farm…</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {!loading && farm ? (
          <>
            <h2 className={styles.sectionTitle}>Farm Info</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Current Crop</span>
                <div className={styles.detailValue}>{farm.currentCrop ?? 'Not planted'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Area</span>
                <div className={styles.detailValue}>{farm.area != null ? `${farm.area} acres` : 'Not provided.'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Soil Type</span>
                <div className={styles.detailValue}>{farm.soilType ?? 'Not provided.'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Irrigation Type</span>
                <div className={styles.detailValue}>{farm.irrigationType ?? 'Not provided.'}</div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Farmer</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Farmer Name</span>
                <div className={styles.detailValue}>{farmer?.name ?? 'Unknown farmer'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Phone</span>
                <div className={styles.detailValue}>{farmer?.phone ?? 'Not provided.'}</div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Location</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Location</span>
                <div className={styles.detailValue}>{farm.location}</div>
              </div>
            </div>
            <div className={styles.mapBox} style={{ marginTop: '1rem' }}>
              <span className={styles.mapCoords}>
                <MapPin size={16} />
                {gpsPoint ? `${gpsPoint.lat}, ${gpsPoint.lng}` : 'No GPS coordinates recorded'}
              </span>
              {gpsPoint && (
                <a className={styles.mapLink} href={googleMapsUrl(gpsPoint)} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps ↗
                </a>
              )}
            </div>

            <h2 className={styles.sectionTitle}>Crop Plan</h2>
            {farmCropPlans.length === 0 ? (
              <div className={styles.emptyState}>No crop plan has been created for this farm yet.</div>
            ) : (
              <div className={styles.detailGrid}>
                {farmCropPlans.map((plan) => (
                  <div key={plan.id} className={styles.detailItem}>
                    <span className={styles.detailLabel}>{plan.planCode}</span>
                    <div className={styles.detailValue}>
                      {plan.crop} · {plan.season}
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`${styles.statusBadge} ${styles[statusBadgeClass(plan.status)] ?? ''}`}>{plan.status}</span>
                      <span className={styles.helperText}>
                        {plan.sowingDate ?? '—'} → {plan.harvestDate ?? '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 className={styles.sectionTitle}>Inspections</h2>
            {farmInspections.length === 0 ? (
              <div className={styles.emptyState}>No inspections recorded for this farm yet.</div>
            ) : (
              <p className={styles.sectionSubtitle} style={{ margin: '0 0 0.75rem' }}>
                {farmInspections.length} inspection{farmInspections.length === 1 ? '' : 's'} on record.{' '}
                <Button size="sm" variant="secondary" onClick={() => navigate(`/farms/${id}/inspections`)}>
                  View all
                </Button>
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
