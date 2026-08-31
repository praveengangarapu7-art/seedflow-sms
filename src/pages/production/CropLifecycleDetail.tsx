import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowLeft, CalendarDays, ClipboardList, Gauge, Sprout } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { CropLifecycleTracker } from '@/components/CropLifecycleTracker';
import {
  masterDataApi,
  productionApi,
  type CropPlan,
  type Farm,
  type Farmer,
  type FieldInspection,
  type SeedVariety,
} from '@/services/api';
import {
  buildCropLifecycle,
  formatLifecycleDate,
  formatLifecycleRange,
  type CropLifecycleStage,
  type CropLifecycleStageKey,
} from '@/utils/cropLifecycle';
import { seedCropPlans, seedFarmers, seedFarms, seedVarieties, statusBadgeClass } from './cropPlanningData';
import { seedFieldInspections } from './fieldInspectionData';
import styles from './production.module.css';
import lifecycleStyles from './cropLifecycle.module.css';

function healthBarClass(score: number): string {
  if (score > 80) return lifecycleStyles.healthBarGood;
  if (score >= 60) return lifecycleStyles.healthBarModerate;
  return lifecycleStyles.healthBarPoor;
}

/** Picks the plan a farm is actively running: growing/sown first, then latest sowing date. */
function pickFarmPlan(plans: CropPlan[], farmId: string): CropPlan | null {
  const farmPlans = plans.filter((plan) => plan.farmId === farmId);
  if (farmPlans.length === 0) return null;

  const rank = (status: string): number => {
    const normalized = status.toLowerCase();
    if (normalized === 'growing') return 0;
    if (normalized === 'sown') return 1;
    if (normalized === 'planned') return 2;
    if (normalized === 'harvested') return 3;
    return 4;
  };

  return [...farmPlans].sort((a, b) => {
    const rankDiff = rank(a.status) - rank(b.status);
    if (rankDiff !== 0) return rankDiff;
    return (b.sowingDate ?? '').localeCompare(a.sowingDate ?? '');
  })[0];
}

export default function CropLifecycleDetail() {
  const params = useParams<{ id?: string; farmId?: string }>();
  const navigate = useNavigate();

  const planIdParam = params.id ?? null;
  const farmIdParam = params.farmId ?? null;

  const [plans, setPlans] = useState<CropPlan[]>(seedCropPlans);
  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [varieties, setVarieties] = useState<SeedVariety[]>(seedVarieties);
  const [inspections, setInspections] = useState<FieldInspection[]>(seedFieldInspections);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageKey, setSelectedStageKey] = useState<CropLifecycleStageKey | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [plansData, farmsData, farmersData, varietiesData, inspectionsData] = await Promise.all([
          productionApi.getCropPlans(),
          masterDataApi.getFarms(),
          masterDataApi.getFarmers(),
          masterDataApi.getVarieties(),
          productionApi.getFieldInspections(),
        ]);
        if (cancelled) return;
        setPlans(Array.isArray(plansData) && plansData.length > 0 ? plansData : seedCropPlans);
        setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
        setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
        setVarieties(Array.isArray(varietiesData) && varietiesData.length > 0 ? varietiesData : seedVarieties);
        setInspections(
          Array.isArray(inspectionsData) && inspectionsData.length > 0 ? inspectionsData : seedFieldInspections,
        );
      } catch (err) {
        if (cancelled) return;
        // The mock/offline path: fall back to the bundled seed data.
        setPlans(seedCropPlans);
        setFarms(seedFarms);
        setFarmers(seedFarmers);
        setVarieties(seedVarieties);
        setInspections(seedFieldInspections);
        if (!planIdParam && !farmIdParam) {
          setError(err instanceof Error ? err.message : 'Unable to load crop lifecycle');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [planIdParam, farmIdParam]);

  const plan = useMemo(() => {
    if (planIdParam) return plans.find((item) => item.id === planIdParam) ?? null;
    if (farmIdParam) return pickFarmPlan(plans, farmIdParam);
    return null;
  }, [plans, planIdParam, farmIdParam]);

  const farmId = plan?.farmId ?? farmIdParam;
  const farm = useMemo(() => farms.find((item) => item.id === farmId) ?? null, [farms, farmId]);
  const farmer = useMemo(
    () => farmers.find((item) => item.id === (plan?.farmerId ?? farm?.farmerId)) ?? null,
    [farmers, plan, farm],
  );
  const variety = useMemo(() => varieties.find((item) => item.id === plan?.varietyId) ?? null, [varieties, plan]);

  const farmInspections = useMemo(
    () => inspections.filter((item) => item.farmId === farmId),
    [inspections, farmId],
  );

  const lifecycle = useMemo(
    () => buildCropLifecycle({ plan, inspections: farmInspections }),
    [plan, farmInspections],
  );

  const selectedStage: CropLifecycleStage | null = useMemo(() => {
    if (selectedStageKey) {
      return lifecycle.stages.find((stage) => stage.key === selectedStageKey) ?? null;
    }
    return lifecycle.currentStage;
  }, [lifecycle, selectedStageKey]);

  const stagesWithInspections = lifecycle.stages.filter((stage) => stage.inspections.length > 0);

  const daysToHarvest = lifecycle.daysRemaining;
  const notFound = !loading && !plan;

  const backTarget = farmIdParam ? `/farms/${farmIdParam}` : planIdParam ? `/crop-planning/${planIdParam}` : '/crop-planning';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Crop Lifecycle</h1>
          <p className={styles.subtitle}>
            {plan
              ? `${plan.planCode} · ${plan.crop}${farm ? ` · ${farm.name}` : ''}`
              : 'Stage-by-stage monitoring of one farm’s crop, from land preparation to harvest.'}
          </p>
        </div>
        <div className={styles.actions}>
          {plan ? (
            <Button variant="ghost" leftIcon={ClipboardList} onClick={() => navigate(`/crop-planning/${plan.id}`)}>
              Crop plan
            </Button>
          ) : null}
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate(backTarget)}>
            Back
          </Button>
        </div>
      </div>

      {loading ? <div className={styles.card}><div className={styles.emptyState}>Loading crop lifecycle…</div></div> : null}
      {error && !loading ? <div className={styles.card}><div className={styles.errorText}>{error}</div></div> : null}

      {notFound ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>
            {farmIdParam
              ? 'This farm has no crop plan yet, so there is no lifecycle to track.'
              : 'Crop plan not found.'}
          </div>
        </div>
      ) : null}

      {!loading && plan ? (
        <>
          <div className={lifecycleStyles.kpiGrid}>
            <div className={lifecycleStyles.kpi}>
              <span className={lifecycleStyles.kpiLabel}><Gauge size={14} /> Progress</span>
              <span className={lifecycleStyles.kpiValue}>{lifecycle.progressPercent}%</span>
              <span className={lifecycleStyles.kpiHint}>
                {lifecycle.completedStages} of {lifecycle.totalStages} stages complete
              </span>
            </div>
            <div className={lifecycleStyles.kpi}>
              <span className={lifecycleStyles.kpiLabel}><Sprout size={14} /> Current Stage</span>
              <span className={lifecycleStyles.kpiValue}>
                {lifecycle.isCancelled ? 'Cancelled' : lifecycle.currentStage?.label ?? '—'}
              </span>
              <span className={lifecycleStyles.kpiHint}>
                {lifecycle.currentStage && !lifecycle.isCancelled
                  ? formatLifecycleRange(lifecycle.currentStage.startDate, lifecycle.currentStage.endDate)
                  : 'Plan is not in progress'}
              </span>
            </div>
            <div className={lifecycleStyles.kpi}>
              <span className={lifecycleStyles.kpiLabel}><CalendarDays size={14} /> Days to Harvest</span>
              <span className={lifecycleStyles.kpiValue}>
                {lifecycle.isComplete ? 'Harvested' : daysToHarvest !== null ? `${daysToHarvest}` : '—'}
              </span>
              <span className={lifecycleStyles.kpiHint}>Harvest {formatLifecycleDate(plan.harvestDate)}</span>
            </div>
            <div className={lifecycleStyles.kpi}>
              <span className={lifecycleStyles.kpiLabel}><Activity size={14} /> Avg Health Score</span>
              <span className={lifecycleStyles.kpiValue}>
                {lifecycle.overallHealthScore !== null ? lifecycle.overallHealthScore : '—'}
              </span>
              <span className={lifecycleStyles.kpiHint}>
                Across {lifecycle.inspectionCount} inspection{lifecycle.inspectionCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className={lifecycleStyles.cardStack}>
            <div className={styles.card}>
              <CropLifecycleTracker
                lifecycle={lifecycle}
                orientation="horizontal"
                title="Lifecycle Overview"
                showInspections={false}
                showDescriptions={false}
                selectedStageKey={selectedStage?.key ?? null}
                onSelectStage={(stage) => setSelectedStageKey(stage.key)}
              />
              <div className={lifecycleStyles.legend}>
                <span className={lifecycleStyles.legendItem}>
                  <span className={`${lifecycleStyles.legendDot} ${lifecycleStyles.legendDotCompleted}`} /> Completed
                </span>
                <span className={lifecycleStyles.legendItem}>
                  <span className={`${lifecycleStyles.legendDot} ${lifecycleStyles.legendDotCurrent}`} /> Current stage
                </span>
                <span className={lifecycleStyles.legendItem}>
                  <span className={lifecycleStyles.legendDot} /> Upcoming
                </span>
                <span className={lifecycleStyles.legendItem}>Select a stage to see its inspections.</span>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Crop &amp; Farm</h2>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Farm</span>
                  <div className={styles.detailValue}>{farm?.name ?? 'Unknown farm'}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Farmer</span>
                  <div className={styles.detailValue}>{farmer?.name ?? 'Unknown farmer'}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Crop / Variety</span>
                  <div className={styles.detailValue}>
                    {plan.crop}
                    {variety ? ` · ${variety.name}` : ''}
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Season</span>
                  <div className={styles.detailValue}>{plan.season || 'Not set'}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Sowing Date</span>
                  <div className={styles.detailValue}>{formatLifecycleDate(plan.sowingDate)}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Harvest Date</span>
                  <div className={styles.detailValue}>{formatLifecycleDate(plan.harvestDate)}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Plan Status</span>
                  <div className={styles.detailValue}>
                    <span className={`${styles.statusBadge} ${styles[statusBadgeClass(plan.status)] ?? ''}`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Lifecycle Window</span>
                  <div className={styles.detailValue}>
                    {formatLifecycleRange(lifecycle.startDate, lifecycle.endDate)}
                    {lifecycle.totalDays !== null ? ` · ${lifecycle.totalDays} days` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className={lifecycleStyles.splitGrid}>
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Stage Timeline</h2>
                <CropLifecycleTracker
                  lifecycle={lifecycle}
                  orientation="vertical"
                  showHeader={false}
                  showInspections
                  selectedStageKey={selectedStage?.key ?? null}
                  onSelectStage={(stage) => setSelectedStageKey(stage.key)}
                />
              </div>

              <div className={lifecycleStyles.cardStack}>
                <div className={styles.card}>
                  <h2 className={styles.sectionTitle}>Health Score by Stage</h2>
                  {stagesWithInspections.length === 0 ? (
                    <div className={styles.emptyState}>No inspections recorded for this crop yet.</div>
                  ) : (
                    <div className={lifecycleStyles.healthChart}>
                      {lifecycle.stages.map((stage) => (
                        <div
                          key={stage.key}
                          className={`${lifecycleStyles.healthRow} ${stage.isCurrent ? lifecycleStyles.healthRowCurrent : ''}`}
                        >
                          <span className={lifecycleStyles.healthRowLabel} title={stage.label}>
                            {stage.order}. {stage.shortLabel}
                          </span>
                          {stage.averageHealthScore !== null ? (
                            <>
                              <span className={lifecycleStyles.healthBarTrack}>
                                <span
                                  className={`${lifecycleStyles.healthBarFill} ${healthBarClass(stage.averageHealthScore)}`}
                                  style={{ width: `${Math.min(100, Math.max(0, stage.averageHealthScore))}%` }}
                                />
                              </span>
                              <span className={lifecycleStyles.healthRowValue}>{stage.averageHealthScore}</span>
                            </>
                          ) : (
                            <>
                              <span className={lifecycleStyles.healthRowEmpty}>No inspection</span>
                              <span className={lifecycleStyles.healthRowValue}>—</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.card}>
                  <h2 className={styles.sectionTitle}>Stage Inspections</h2>
                  {selectedStage ? (
                    <div className={lifecycleStyles.stagePanel}>
                      <div className={lifecycleStyles.stagePanelHeader}>
                        <div>
                          <h3 className={lifecycleStyles.stagePanelTitle}>
                            Stage {selectedStage.order} · {selectedStage.label}
                          </h3>
                          <span className={lifecycleStyles.stagePanelMeta}>
                            {formatLifecycleRange(selectedStage.startDate, selectedStage.endDate)}
                            {selectedStage.durationDays !== null ? ` · ${selectedStage.durationDays} days` : ''}
                          </span>
                        </div>
                        <span className={lifecycleStyles.stagePanelStatus}>{selectedStage.status}</span>
                      </div>

                      <p className={lifecycleStyles.stagePanelMeta}>{selectedStage.description}</p>

                      {selectedStage.inspections.length === 0 ? (
                        <div className={styles.emptyState}>No inspection has been recorded at this stage.</div>
                      ) : (
                        <div className={lifecycleStyles.inspectionCards}>
                          {selectedStage.inspections.map((inspection) => (
                            <div key={inspection.id} className={lifecycleStyles.inspectionCard}>
                              <div className={lifecycleStyles.inspectionCardTop}>
                                <span className={lifecycleStyles.inspectionCardCode}>{inspection.inspectionCode}</span>
                                <span
                                  className={`${styles.healthBadge} ${
                                    inspection.healthScore > 80
                                      ? styles.healthGood
                                      : inspection.healthScore >= 60
                                        ? styles.healthModerate
                                        : styles.healthPoor
                                  }`}
                                >
                                  {inspection.healthScore}
                                </span>
                              </div>
                              <span className={lifecycleStyles.inspectionCardMeta}>
                                {formatLifecycleDate(inspection.inspectionDate)} · {inspection.inspectorName}
                              </span>
                              {inspection.diseaseDetected ? (
                                <span className={styles.diseaseTag}>
                                  <AlertTriangle size={12} /> {inspection.diseaseName ?? 'Disease detected'}
                                </span>
                              ) : null}
                              {inspection.notes ? (
                                <span className={lifecycleStyles.inspectionCardNotes}>{inspection.notes}</span>
                              ) : null}
                              <button
                                type="button"
                                className={lifecycleStyles.linkButton}
                                onClick={() => navigate(`/inspections/${inspection.id}`)}
                              >
                                View full inspection →
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>Select a stage in the timeline to see its inspections.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
