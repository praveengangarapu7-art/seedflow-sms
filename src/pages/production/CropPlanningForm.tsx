import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  IRRIGATION_TYPES,
  SOIL_TYPES,
  confirmCropPlanBooking,
  createCropPlanDraft,
  createFarm,
  fetchCrops,
  fetchFarmers,
  fetchFarms,
  fetchSeedLotRecommendations,
  fetchVarieties,
  login,
  reserveCropPlanSeedLot,
  type CropPlanWithContext,
  type CropRow,
  type Farm,
  type FarmerRow,
  type IrrigationType,
  type SeedLotRecommendation,
  type SoilType,
  type VarietyWithLatestVersion,
} from '@/services/seedLotRealtimeClient';
import styles from './production.module.css';

// Farmer-Centric Features: "Crop Planning Wizard with Seed Recommendations".
// This replaces the old mock, backend-less form with a real 3-step wizard
// wired to the already-built cropPlanning module (draft -> reserve ->
// confirm/cancel — see server/src/modules/cropPlanning/cropPlanning.service.ts).
// Step 1: farmer + farm. Step 2: crop, variety, area — submitting it creates
// the real draft plan and immediately loads Step 3: Recommended Seed Lots,
// ranked by certified status, germination %, available quantity, and
// storage zone proximity, each reservable with one click.

const CREATE_DRAFT_ROLES = new Set(['Admin', 'Producer', 'Warehouse Manager']);
const RESERVE_ROLES = new Set(['Admin', 'Warehouse Manager']);

type WizardStep = 1 | 2 | 3 | 4;

function scoreBadgeClass(score: number): string {
  if (score >= 60) return styles.healthGood;
  if (score >= 30) return styles.healthModerate;
  return styles.healthPoor;
}

export default function CropPlanningForm() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);

  const [step, setStep] = useState<WizardStep>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Farmer & Farm
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmerId, setFarmerId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [newFarm, setNewFarm] = useState({ name: '', soilType: 'loamy' as SoilType, areaAcres: '', irrigationType: '' as IrrigationType | '' });
  const [creatingFarm, setCreatingFarm] = useState(false);

  // Step 2 — Crop, Variety & Area
  const [crops, setCrops] = useState<CropRow[]>([]);
  const [varieties, setVarieties] = useState<VarietyWithLatestVersion[]>([]);
  const [crop, setCrop] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [targetAreaAcres, setTargetAreaAcres] = useState('');
  const [sowingDate, setSowingDate] = useState('');

  // Step 3 — draft plan + seed lot recommendations
  const [plan, setPlan] = useState<CropPlanWithContext | null>(null);
  const [recommendations, setRecommendations] = useState<SeedLotRecommendation[] | null>(null);
  const [reservingLotId, setReservingLotId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const selectedFarmer = useMemo(() => farmers.find((f) => f.id === farmerId), [farmers, farmerId]);
  const selectedFarm = useMemo(() => farms.find((f) => f.id === farmId), [farms, farmId]);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);
        const [farmerList, cropList] = await Promise.all([fetchFarmers(accessToken), fetchCrops(accessToken, { active: true })]);
        if (cancelled) return;
        setFarmers(farmerList);
        setCrops(cropList);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the crop planning service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (!token || !farmerId) {
      setFarms([]);
      setFarmId('');
      return;
    }
    fetchFarms(token, farmerId).then(setFarms).catch(() => setFarms([]));
  }, [token, farmerId]);

  useEffect(() => {
    if (!token || !crop.trim()) {
      setVarieties([]);
      setVarietyId('');
      return;
    }
    fetchVarieties(token, { crop: crop.trim(), status: 'approved' }).then(setVarieties).catch(() => setVarieties([]));
  }, [token, crop]);

  const handleFarmerChange = (id: string) => {
    setFarmerId(id);
    setFarmId('');
  };

  const handleCreateFarm = async () => {
    if (!token || !farmerId) return;
    if (!newFarm.name.trim() || !newFarm.areaAcres) {
      setError('Farm name and area (acres) are required.');
      return;
    }
    setCreatingFarm(true);
    setError(null);
    try {
      const farm = await createFarm(token, {
        farmerId,
        name: newFarm.name.trim(),
        soilType: newFarm.soilType,
        areaAcres: Number(newFarm.areaAcres),
        irrigationType: newFarm.irrigationType || undefined,
      });
      setFarms(await fetchFarms(token, farmerId));
      setFarmId(farm.id);
      setNewFarm({ name: '', soilType: 'loamy', areaAcres: '', irrigationType: '' });
      addToast('Farm added', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create farm');
    } finally {
      setCreatingFarm(false);
    }
  };

  const goToStep2 = () => {
    if (!farmerId) {
      setError('Please select a farmer.');
      return;
    }
    if (!farmId) {
      setError('Please select (or add) a farm for this farmer.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleGetRecommendations = async () => {
    if (!token) return;
    if (!crop.trim()) {
      setError('Please select a crop.');
      return;
    }
    if (!varietyId) {
      setError('Please select a variety.');
      return;
    }
    const areaValue = Number(targetAreaAcres);
    if (!targetAreaAcres || Number.isNaN(areaValue) || areaValue <= 0) {
      setError('Target area (acres) must be a positive number.');
      return;
    }
    if (!CREATE_DRAFT_ROLES.has(role)) {
      setError(`Creating a crop plan requires one of: ${Array.from(CREATE_DRAFT_ROLES).join(', ')}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const draft = await createCropPlanDraft(token, {
        farmerId,
        farmId,
        crop: crop.trim(),
        varietyId,
        targetAreaAcres: areaValue,
        sowingDate: sowingDate || undefined,
      });
      setPlan(draft);
      const recos = await fetchSeedLotRecommendations(token, draft.id);
      setRecommendations(recos);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create crop plan draft');
    } finally {
      setBusy(false);
    }
  };

  const handleReserve = async (seedLotId: string) => {
    if (!token || !plan) return;
    if (!RESERVE_ROLES.has(role)) {
      setError(`Reserving a seed lot requires one of: ${Array.from(RESERVE_ROLES).join(', ')}.`);
      return;
    }
    setReservingLotId(seedLotId);
    setError(null);
    try {
      const reserved = await reserveCropPlanSeedLot(token, plan.id, seedLotId);
      setPlan(reserved);
      addToast('Seed lot reserved — crop plan created', 'success');
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reserve this seed lot');
    } finally {
      setReservingLotId(null);
    }
  };

  const handleConfirmBooking = async () => {
    if (!token || !plan) return;
    setConfirming(true);
    setError(null);
    try {
      const confirmed = await confirmCropPlanBooking(token, plan.id);
      setPlan(confirmed);
      addToast('Booking confirmed', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm this booking');
    } finally {
      setConfirming(false);
    }
  };

  const handleStartOver = () => {
    setStep(1);
    setFarmerId('');
    setFarmId('');
    setCrop('');
    setVarietyId('');
    setTargetAreaAcres('');
    setSowingDate('');
    setPlan(null);
    setRecommendations(null);
    setError(null);
  };

  const STEPS: { id: WizardStep; label: string }[] = [
    { id: 1, label: 'Farmer & Farm' },
    { id: 2, label: 'Crop, Variety & Area' },
    { id: 3, label: 'Recommended Seed Lots' },
    { id: 4, label: 'Reserved' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Create Crop Plan</h1>
          <p className={styles.subtitle}>
            Select a farmer and farm, then crop/variety/area — see recommended seed lots ranked by certification,
            germination rate, available quantity, and storage proximity, and reserve one immediately.
          </p>
        </div>
        <div className={styles.actions}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/crop-planning')}>
            Back to list
          </Button>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: '1.25rem' }}>
        <div className={styles.filterRow} style={{ marginBottom: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                className={styles.healthBadge}
                style={{
                  background: step === s.id ? 'var(--color-primary)' : step > s.id ? '#e6f7ec' : '#f0f0f0',
                  color: step === s.id ? 'white' : step > s.id ? '#187a43' : '#6b6b6b',
                }}
              >
                {step > s.id ? <CheckCircle2 size={16} /> : s.id}
              </span>
              <span style={{ color: step === s.id ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: step === s.id ? 700 : 500 }}>
                {s.label}
              </span>
              {i < STEPS.length - 1 ? <ArrowRight size={14} color="var(--color-text-muted)" /> : null}
            </div>
          ))}
        </div>
      </div>

      {error ? <div className={styles.card} style={{ marginBottom: '1.25rem' }}><span className={styles.errorText}>{error}</span></div> : null}

      {step === 1 ? (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Step 1 — Farmer &amp; Farm</h2>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="farmer">Farmer</label>
              <select id="farmer" className={styles.select} value={farmerId} onChange={(e) => handleFarmerChange(e.target.value)}>
                <option value="">Select a farmer</option>
                {farmers.map((farmer) => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.name} ({farmer.region})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="farm">Farm</label>
              <select id="farm" className={styles.select} value={farmId} onChange={(e) => setFarmId(e.target.value)} disabled={!farmerId}>
                <option value="">{farmerId ? 'Select a farm' : 'Select a farmer first'}</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} — {farm.area_acres} acres ({farm.soil_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {farmerId && farms.length === 0 ? (
            <>
              <p className={styles.helperText} style={{ marginTop: '0.75rem' }}>
                {selectedFarmer?.name ?? 'This farmer'} has no farms on record yet — add one to continue.
              </p>
              <div className={styles.formGrid} style={{ marginTop: '0.5rem' }}>
                <div className={styles.field}>
                  <label className={styles.label}>New farm name</label>
                  <Input value={newFarm.name} onChange={(e) => setNewFarm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. North Field" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Area (acres)</label>
                  <Input type="number" min="0" value={newFarm.areaAcres} onChange={(e) => setNewFarm((f) => ({ ...f, areaAcres: e.target.value }))} placeholder="e.g. 5" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Soil type</label>
                  <select className={styles.select} value={newFarm.soilType} onChange={(e) => setNewFarm((f) => ({ ...f, soilType: e.target.value as SoilType }))}>
                    {SOIL_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Irrigation type</label>
                  <select className={styles.select} value={newFarm.irrigationType} onChange={(e) => setNewFarm((f) => ({ ...f, irrigationType: e.target.value as IrrigationType }))}>
                    <option value="">Not specified</option>
                    {IRRIGATION_TYPES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.actions} style={{ marginTop: '0.75rem' }}>
                <Button size="sm" variant="secondary" isLoading={creatingFarm} onClick={() => void handleCreateFarm()}>Add Farm</Button>
              </div>
            </>
          ) : null}

          <div className={styles.actions} style={{ marginTop: '1.25rem' }}>
            <Button rightIcon={ArrowRight} onClick={goToStep2}>Next: Crop, Variety &amp; Area</Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Step 2 — Crop, Variety &amp; Area</h2>
          <p className={styles.helperText}>
            {selectedFarmer?.name} · {selectedFarm?.name} ({selectedFarm?.area_acres} acres available)
          </p>
          <div className={styles.formGrid} style={{ marginTop: '0.75rem' }}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="crop">Crop</label>
              <select id="crop" className={styles.select} value={crop} onChange={(e) => { setCrop(e.target.value); setVarietyId(''); }}>
                <option value="">Select a crop</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="variety">Variety</label>
              <select id="variety" className={styles.select} value={varietyId} onChange={(e) => setVarietyId(e.target.value)} disabled={!crop}>
                <option value="">{crop ? 'Select a variety' : 'Select a crop first'}</option>
                {varieties.map((v) => (
                  <option key={v.id} value={v.id}>{v.variety_name}</option>
                ))}
              </select>
              {crop && varieties.length === 0 ? (
                <span className={styles.helperText}>No approved varieties registered for "{crop}" yet.</span>
              ) : null}
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="targetArea">Target Area (acres)</label>
              <Input
                id="targetArea"
                type="number"
                min="0"
                value={targetAreaAcres}
                onChange={(e) => setTargetAreaAcres(e.target.value)}
                placeholder="e.g. 3"
                helperText={
                  selectedFarm && Number(targetAreaAcres) > selectedFarm.area_acres
                    ? `This farm is only ${selectedFarm.area_acres} acres — double check this figure.`
                    : selectedFarm
                      ? `Up to ${selectedFarm.area_acres} acres on this farm`
                      : undefined
                }
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="sowingDate">Sowing Date (optional)</label>
              <input id="sowingDate" type="date" className={styles.input} value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} />
            </div>
          </div>

          {!CREATE_DRAFT_ROLES.has(role) ? (
            <p className={styles.errorText}>
              Signed in as {role} — creating a crop plan requires {Array.from(CREATE_DRAFT_ROLES).join(', ')}. Switch accounts above to continue.
            </p>
          ) : null}

          <div className={styles.actions} style={{ marginTop: '0.75rem' }}>
            <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => setStep(1)}>Back</Button>
            <Button rightIcon={ArrowRight} isLoading={busy} onClick={() => void handleGetRecommendations()}>
              Get Recommended Seed Lots
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 && plan ? (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Step 3 — Recommended Seed Lots</h2>
          <div className={styles.detailGrid} style={{ marginBottom: '1rem' }}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Crop / Variety</span>
              <span className={styles.detailValue}>{plan.crop} — {plan.variety_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Seed Quantity Required</span>
              <span className={styles.detailValue}>{plan.calculated_seed_quantity}{plan.seed_unit}</span>
            </div>
          </div>

          {!RESERVE_ROLES.has(role) ? (
            <p className={styles.errorText}>
              Signed in as {role} — reserving a seed lot requires {Array.from(RESERVE_ROLES).join(', ')}. Switch accounts above to reserve.
            </p>
          ) : null}

          {recommendations === null ? (
            <div className={styles.emptyState}>Loading recommendations…</div>
          ) : recommendations.length === 0 ? (
            <div className={styles.emptyState}>
              No Certified, active seed lot of {plan.crop} — {plan.variety_name} currently has enough quantity for this plan.
              Register or top up a matching lot in the Seed Lot Register, then start over.
            </div>
          ) : (
            <div className={styles.grid}>
              {recommendations.map((rec) => (
                <div key={rec.seedLotId} className={styles.groupCard}>
                  <div className={styles.groupHeader}>
                    <div>
                      <h3 className={styles.groupTitle}>{rec.lotCode}</h3>
                      <span className={styles.groupMeta}>
                        {rec.quantityAvailable}{rec.unit} available · produced {new Date(rec.productionDate).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`${styles.healthBadge} ${scoreBadgeClass(rec.score)}`}>{rec.score}</span>
                  </div>
                  <div className={styles.pillList} style={{ marginBottom: '0.6rem' }}>
                    <span className={`${styles.statusBadge} ${rec.isCertified ? styles.statusConfirmed : styles.statusPending}`}>
                      {rec.isCertified ? 'Certified' : 'Not certified'}
                    </span>
                    <span className={styles.pill}>Testing: {rec.testingStatus.replace('_', ' ')}</span>
                    {rec.germinationPercent != null ? <span className={styles.pill}>Germination {rec.germinationPercent}%</span> : null}
                    {rec.storageZones.length > 0 ? <span className={styles.pill}>{rec.storageZones.join(', ')}</span> : null}
                  </div>
                  {rec.reasons.length > 0 ? (
                    <ul className={styles.recommendationList}>
                      {rec.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className={styles.actions} style={{ marginTop: '0.75rem' }}>
                    <Button
                      size="sm"
                      leftIcon={Sprout}
                      isLoading={reservingLotId === rec.seedLotId}
                      disabled={!RESERVE_ROLES.has(role) || reservingLotId !== null}
                      onClick={() => void handleReserve(rec.seedLotId)}
                    >
                      Reserve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.actions} style={{ marginTop: '1rem' }}>
            <Button variant="secondary" leftIcon={RotateCcw} onClick={handleStartOver}>Start Over</Button>
          </div>
        </div>
      ) : null}

      {step === 4 && plan ? (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: 6, color: '#187a43' }} />
            Seed Lot Reserved — Crop Plan Created
          </h2>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Farmer / Farm</span>
              <span className={styles.detailValue}>{plan.farmer_name} — {plan.farm_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Crop / Variety</span>
              <span className={styles.detailValue}>{plan.crop} — {plan.variety_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Target Area</span>
              <span className={styles.detailValue}>{plan.target_area_acres} acres</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Reserved Lot</span>
              <span className={styles.detailValue}>{plan.lot_code} ({plan.calculated_seed_quantity}{plan.seed_unit})</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <span className={`${styles.statusBadge} ${plan.status === 'confirmed' ? styles.statusConfirmed : styles.statusReserved}`}>
                {plan.status}
              </span>
            </div>
          </div>

          <div className={styles.actions} style={{ marginTop: '1.25rem' }}>
            {plan.status === 'reserved' ? (
              <Button leftIcon={CheckCircle2} isLoading={confirming} onClick={() => void handleConfirmBooking()}>
                Confirm Booking
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => navigate('/production-targets')}>View in Production Targets</Button>
            <Button variant="secondary" leftIcon={RotateCcw} onClick={handleStartOver}>Create Another Plan</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
