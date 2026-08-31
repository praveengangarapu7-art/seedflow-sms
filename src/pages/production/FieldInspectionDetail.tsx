import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { masterDataApi, productionApi, type Farm, type Farmer, type FieldInspection } from '@/services/api';
import { seedFarmers, seedFarms } from './cropPlanningData';
import { healthScoreClass, seedFieldInspections } from './fieldInspectionData';
import styles from './production.module.css';

export default function FieldInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<FieldInspection | null>(null);
  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [inspectionData, farmsData, farmersData] = await Promise.all([
          productionApi.getFieldInspection(id),
          masterDataApi.getFarms(),
          masterDataApi.getFarmers(),
        ]);
        setInspection(inspectionData);
        setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
        setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
      } catch (err) {
        const fallback = seedFieldInspections.find((item) => item.id === id) ?? null;
        if (fallback) {
          setInspection(fallback);
          setFarms(seedFarms);
          setFarmers(seedFarmers);
        } else {
          const message = err instanceof Error ? err.message : 'Unable to load inspection';
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const farm = useMemo(() => farms.find((f) => f.id === inspection?.farmId), [farms, inspection]);
  const farmer = useMemo(() => farmers.find((f) => f.id === farm?.farmerId), [farmers, farm]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{inspection ? inspection.inspectionCode : 'Inspection Details'}</h1>
          <p className={styles.subtitle}>Field inspection record with AI-assisted crop health analysis.</p>
        </div>
        <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/inspections')}>
          Back to list
        </Button>
      </div>

      <div className={styles.card}>
        {loading ? <div className={styles.emptyState}>Loading inspection…</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {!loading && inspection ? (
          <>
            <h2 className={styles.sectionTitle}>Inspection Info</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Date</span>
                <div className={styles.detailValue}>{inspection.inspectionDate ?? '—'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Crop Stage</span>
                <div className={styles.detailValue}>{inspection.cropStage}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Inspector</span>
                <div className={styles.detailValue}>{inspection.inspectorName}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Health Score</span>
                <div className={styles.detailValue}>
                  <span className={`${styles.healthBadge} ${styles[healthScoreClass(inspection.healthScore)] ?? ''}`}>
                    {inspection.healthScore}
                  </span>
                </div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Farm</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Farm Name</span>
                <div className={styles.detailValue}>{farm?.name ?? 'Unknown farm'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Location</span>
                <div className={styles.detailValue}>{farm?.location ?? 'Not provided.'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Farmer</span>
                <div className={styles.detailValue}>{farmer?.name ?? 'Unknown farmer'}</div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Current Crop</span>
                <div className={styles.detailValue}>{farm?.currentCrop ?? 'Not provided.'}</div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Disease &amp; Notes</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Disease Detected</span>
                <div className={styles.detailValue}>
                  {inspection.diseaseDetected ? (
                    <span className={styles.diseaseTag}>{inspection.diseaseName ?? 'Detected'}</span>
                  ) : (
                    <span className={styles.noneTag}>None</span>
                  )}
                </div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Notes</span>
                <div className={styles.detailValue}>{inspection.notes ?? 'No notes recorded.'}</div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Photos</h2>
            {inspection.photos && inspection.photos.length > 0 ? (
              <div className={styles.photoGrid}>
                {inspection.photos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className={styles.photoThumb}>
                    {photo.startsWith('http') || photo.startsWith('blob:') || photo.startsWith('data:') ? (
                      <img src={photo} alt={`Inspection photo ${index + 1}`} />
                    ) : (
                      photo
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>No photos attached to this inspection.</div>
            )}

            <h2 className={styles.sectionTitle}>AI Predictions</h2>
            {inspection.aiPrediction ? (
              <div className={styles.aiCard}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Disease Risk</span>
                    <div className={styles.detailValue}>{inspection.aiPrediction.diseaseRiskPercent}%</div>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Nutrient Deficiency</span>
                    <div className={styles.detailValue}>{inspection.aiPrediction.nutrientDeficiency ?? 'None detected'}</div>
                  </div>
                </div>

                <div>
                  <span className={styles.detailLabel}>Pests Detected</span>
                  {inspection.aiPrediction.pestsDetected.length > 0 ? (
                    <div className={styles.pillList} style={{ marginTop: '0.4rem' }}>
                      {inspection.aiPrediction.pestsDetected.map((pest) => (
                        <span key={pest} className={styles.pill}>{pest}</span>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.detailValue}>None detected</div>
                  )}
                </div>

                <div>
                  <span className={styles.detailLabel}>Recommendations</span>
                  <ul className={styles.recommendationList}>
                    {inspection.aiPrediction.recommendations.map((recommendation) => (
                      <li key={recommendation}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>AI analysis is not available for this inspection.</div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
