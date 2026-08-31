import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, Send, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  masterDataApi,
  productionApi,
  type CropPlan,
  type Farm,
  type Farmer,
  type SeedVariety,
} from '@/services/api';
import { seedCropPlans, seedFarmers, seedFarms, seedVarieties } from './cropPlanningData';
import {
  createHarvestRequest,
  formatHarvestDate,
  formatKg,
  harvestStatusClass,
  resolveVarietyForFarm,
  useHarvestRequests,
  type HarvestRequest,
} from './harvestData';
import styles from './production.module.css';
import harvestStyles from './harvest.module.css';

export default function HarvestRequestForm() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [varieties, setVarieties] = useState<SeedVariety[]>(seedVarieties);
  const [cropPlans, setCropPlans] = useState<CropPlan[]>(seedCropPlans);

  const [farmId, setFarmId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [estimatedQuantity, setEstimatedQuantity] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<HarvestRequest | null>(null);

  const requests = useHarvestRequests();

  useEffect(() => {
    const load = async () => {
      try {
        const [farmsData, farmersData, varietiesData, cropPlansData] = await Promise.all([
          masterDataApi.getFarms(),
          masterDataApi.getFarmers(),
          masterDataApi.getVarieties(),
          productionApi.getCropPlans(),
        ]);
        setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
        setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
        setVarieties(Array.isArray(varietiesData) && varietiesData.length > 0 ? varietiesData : seedVarieties);
        setCropPlans(Array.isArray(cropPlansData) && cropPlansData.length > 0 ? cropPlansData : seedCropPlans);
      } catch {
        setFarms(seedFarms);
        setFarmers(seedFarmers);
        setVarieties(seedVarieties);
        setCropPlans(seedCropPlans);
      }
    };

    void load();
  }, []);

  const farm = useMemo(() => farms.find((item) => item.id === farmId) ?? null, [farms, farmId]);
  const farmer = useMemo(() => farmers.find((item) => item.id === farm?.farmerId) ?? null, [farmers, farm]);

  // Variety is auto-filled from the farm's active crop plan.
  const resolved = useMemo(
    () => (farmId ? resolveVarietyForFarm(farmId, { cropPlans, varieties, farms }) : null),
    [farmId, cropPlans, varieties, farms],
  );

  useEffect(() => {
    if (!farmId) {
      setVarietyId('');
      return;
    }
    setVarietyId(resolved?.variety?.id ?? '');
    if (resolved?.cropPlan?.harvestDate && !harvestDate) {
      setHarvestDate(resolved.cropPlan.harvestDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, resolved?.variety?.id]);

  const selectedVariety = useMemo(
    () => varieties.find((item) => item.id === varietyId) ?? null,
    [varieties, varietyId],
  );

  const myRequests = useMemo(
    () => [...requests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)).slice(0, 5),
    [requests],
  );

  function resetForm() {
    setFarmId('');
    setVarietyId('');
    setEstimatedQuantity('');
    setHarvestDate('');
    setNotes('');
    setError(null);
    setSubmitted(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!farmId) {
      setError('Please select a farm.');
      return;
    }
    if (!varietyId) {
      setError('No variety could be resolved for this farm. Add a crop plan for it first.');
      return;
    }
    const quantity = Number(estimatedQuantity);
    if (!estimatedQuantity.trim() || Number.isNaN(quantity) || quantity <= 0) {
      setError('Enter an estimated quantity greater than zero.');
      return;
    }
    if (!harvestDate) {
      setError('Please choose an expected harvest date.');
      return;
    }

    setSubmitting(true);
    try {
      const created = createHarvestRequest({
        farmId,
        farmerId: farm?.farmerId ?? '',
        varietyId,
        crop: selectedVariety?.crop || resolved?.crop || farm?.currentCrop || '',
        cropPlanId: resolved?.cropPlan?.id,
        estimatedQuantityKg: Math.round(quantity),
        requestedHarvestDate: harvestDate,
        notes: notes.trim() || undefined,
        requestedBy: farmer?.name ?? user?.name ?? 'Farmer',
      });
      setSubmitted(created);
      addToast(`Harvest request ${created.requestCode} submitted for approval`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit harvest request';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Request Harvest</h1>
          <p className={styles.subtitle}>
            Raise a harvest request for an inspector to verify field readiness before cutting.
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" leftIcon={ClipboardList} onClick={() => navigate('/harvests')}>
            Harvest register
          </Button>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/crop-planning')}>
            Back
          </Button>
        </div>
      </div>

      {submitted ? (
        <div className={styles.card}>
          <div className={harvestStyles.successPanel}>
            <h2 className={harvestStyles.successTitle}>
              <CheckCircle2 size={20} />
              Request {submitted.requestCode} submitted
            </h2>
            <p className={harvestStyles.successMeta}>
              {farm?.name ?? 'Farm'} · {selectedVariety?.name ?? submitted.crop} ·{' '}
              {formatKg(submitted.estimatedQuantityKg)} expected on {formatHarvestDate(submitted.requestedHarvestDate)}.
              An inspector will verify field readiness and generate the seed lot ID on approval.
            </p>
            <div>
              <span className={`${harvestStyles.status} ${harvestStyles[harvestStatusClass(submitted.status)]}`}>
                {submitted.status}
              </span>
            </div>
            <div className={styles.actions}>
              <Button leftIcon={Sprout} onClick={resetForm}>
                Submit another request
              </Button>
              <Button variant="secondary" onClick={() => navigate('/harvests/approval')}>
                View approval queue
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit}>
            {error ? <div className={styles.errorText}>{error}</div> : null}

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="farm">Farm</label>
                <select
                  id="farm"
                  className={styles.select}
                  value={farmId}
                  onChange={(event) => setFarmId(event.target.value)}
                >
                  <option value="">Select a farm</option>
                  {farms.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.location}
                    </option>
                  ))}
                </select>
                <span className={styles.helperText}>
                  {farmer ? `Farmer: ${farmer.name}${farmer.kycVerified ? ' · KYC verified' : ' · KYC pending'}` : 'Choose the field being harvested.'}
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="variety">Variety</label>
                <select
                  id="variety"
                  className={styles.select}
                  value={varietyId}
                  onChange={(event) => setVarietyId(event.target.value)}
                  disabled={!farmId}
                >
                  <option value="">{farmId ? 'No variety found for this farm' : 'Select a farm first'}</option>
                  {varieties.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.crop})
                    </option>
                  ))}
                </select>
                <span className={styles.helperText}>
                  {resolved?.cropPlan
                    ? `Auto-filled from crop plan ${resolved.cropPlan.planCode}.`
                    : 'Auto-filled from the farm’s active crop plan.'}
                </span>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="quantity">Estimated Quantity (kg)</label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={estimatedQuantity}
                  onChange={(event) => setEstimatedQuantity(event.target.value)}
                  placeholder="e.g. 4200"
                />
                <span className={styles.helperText}>
                  {resolved?.cropPlan?.targetYield
                    ? `Plan target: ${formatKg(resolved.cropPlan.targetYield)}.`
                    : 'Your best estimate of the yield from this field.'}
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="harvestDate">Harvest Date</label>
                <Input
                  id="harvestDate"
                  type="date"
                  value={harvestDate}
                  onChange={(event) => setHarvestDate(event.target.value)}
                />
                <span className={styles.helperText}>The date you expect to start cutting.</span>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className={styles.textarea}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Field condition, moisture readings, access constraints…"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Status on submission</span>
              <div className={harvestStyles.readOnlyValue}>
                <span className={`${harvestStyles.status} ${harvestStyles.hsPendingApproval}`}>Pending Approval</span>
                <span className={harvestStyles.readOnlyHint}>
                  The seed lot tracking ID is generated once an inspector approves this request.
                </span>
              </div>
            </div>

            <div className={styles.actions}>
              <Button type="submit" leftIcon={Send} isLoading={submitting}>
                Submit Harvest Request
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.card} style={{ marginTop: '1.25rem' }}>
        <h2 className={styles.sectionTitle}>Recent Requests</h2>
        {myRequests.length === 0 ? (
          <div className={styles.emptyState}>No harvest requests raised yet.</div>
        ) : (
          <div className={harvestStyles.inlineList}>
            {myRequests.map((request) => {
              const requestFarm = farms.find((item) => item.id === request.farmId);
              return (
                <div key={request.id} className={harvestStyles.inlineRow}>
                  <div className={harvestStyles.inlineRowMain}>
                    <span className={harvestStyles.inlineRowTitle}>
                      {request.requestCode} · {requestFarm?.name ?? 'Unknown farm'}
                    </span>
                    <span className={harvestStyles.inlineRowMeta}>
                      {request.crop} · {formatKg(request.estimatedQuantityKg)} · expected{' '}
                      {formatHarvestDate(request.requestedHarvestDate)}
                      {request.lotId ? ` · ${request.lotId}` : ''}
                    </span>
                  </div>
                  <span className={`${harvestStyles.status} ${harvestStyles[harvestStatusClass(request.status)]}`}>
                    {request.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
