import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  fetchBreederPerformance,
  fetchEnvironmentalAdaptation,
  fetchFarmers,
  fetchLotPerformance,
  fetchSeedLots,
  login,
  recordLotFieldInspection,
  type BreederPerformanceEntry,
  type EnvironmentalAdaptationEntry,
  type FarmerRow,
  type LotPerformanceEntry,
  type PerformanceRating,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedFeedbackLoop.module.css';

function ratingClass(rating: PerformanceRating): string {
  return (
    {
      high: styles.ratingHigh,
      moderate: styles.ratingModerate,
      low: styles.ratingLow,
      insufficient_data: styles.ratingInsufficient,
    }[rating] ?? styles.ratingInsufficient
  );
}

function formatPercent(value: number | null): string {
  return value == null ? '—' : `${value}%`;
}

export default function SeedFeedbackLoop() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(3); // Inspector by default
  const [token, setToken] = useState<string | null>(null);
  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [lotPerformance, setLotPerformance] = useState<LotPerformanceEntry[]>([]);
  const [breederPerformance, setBreederPerformance] = useState<BreederPerformanceEntry[]>([]);
  const [environmental, setEnvironmental] = useState<EnvironmentalAdaptationEntry[]>([]);

  const [inspLotId, setInspLotId] = useState('');
  const [inspFarmerId, setInspFarmerId] = useState('');
  const [inspHealthScore, setInspHealthScore] = useState('75');
  const [inspDiseaseDetected, setInspDiseaseDetected] = useState(false);
  const [inspDiseaseName, setInspDiseaseName] = useState('');
  const [inspNotes, setInspNotes] = useState('');
  const [inspDate, setInspDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshReports = useCallback(async (accessToken: string) => {
    const [lotResult, breederResult, envResult] = await Promise.all([
      fetchLotPerformance(accessToken),
      fetchBreederPerformance(accessToken),
      fetchEnvironmentalAdaptation(accessToken),
    ]);
    setLotPerformance(lotResult);
    setBreederPerformance(breederResult);
    setEnvironmental(envResult);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);

        const [lotsResult, farmersResult] = await Promise.all([fetchSeedLots(accessToken), fetchFarmers(accessToken)]);
        if (cancelled) return;
        setLots(lotsResult.filter((lot) => lot.stage === 'Certified'));
        setFarmers(farmersResult);

        await refreshReports(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the feedback service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) return;
    if (!inspLotId) {
      setError('Select a Certified seed lot.');
      return;
    }
    const healthScore = Number(inspHealthScore);
    if (!Number.isInteger(healthScore) || healthScore < 0 || healthScore > 100) {
      setError('Health score must be a whole number between 0 and 100.');
      return;
    }
    if (inspDiseaseDetected && !inspDiseaseName.trim()) {
      setError('Enter the disease name.');
      return;
    }

    setSubmitting(true);
    try {
      await recordLotFieldInspection(token, {
        seedLotId: inspLotId,
        farmerId: inspFarmerId || undefined,
        healthScore,
        diseaseDetected: inspDiseaseDetected,
        diseaseName: inspDiseaseDetected ? inspDiseaseName.trim() : undefined,
        environmentalNotes: inspNotes.trim() || undefined,
        inspectionDate: inspDate,
      });
      addToast('Field inspection recorded against seed lot', 'success');
      setInspDiseaseName('');
      setInspNotes('');
      await refreshReports(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to record inspection';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const highCount = lotPerformance.filter((e) => e.performanceRating === 'high').length;
  const lowCount = lotPerformance.filter((e) => e.performanceRating === 'low').length;
  const totalInspections = lotPerformance.reduce((sum, e) => sum + e.inspectionCount, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Field Inspection → Seed Lot Feedback Loop</h1>
          <p className={styles.subtitle}>
            Field health/disease observations linked back to the exact Certified lot planted — rolled up into lot
            performance, breeder ratings (traced through genealogy), and regional adaptation.
          </p>
        </div>
        <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
          {DEMO_ACCOUNTS.map((account, index) => (
            <option key={account.email} value={index}>
              Viewing as: {account.role}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.kpiRow}>
        <KpiCard title="Field Inspections" value={String(totalInspections)} icon={ClipboardCheck} />
        <KpiCard title="High-Performing Lots" value={String(highCount)} icon={ClipboardCheck} />
        <KpiCard title="Low-Performing Lots" value={String(lowCount)} icon={ClipboardCheck} />
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Certified Lot Performance</h2>
            <p className={styles.sectionSubtitle}>Field health &amp; disease incidence, cross-referenced with real lab germination rates.</p>
            {lotPerformance.length === 0 ? (
              <div className={styles.emptyState}>No Certified lots to report on.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Inspections</th>
                    <th>Avg Health</th>
                    <th>Disease %</th>
                    <th>Germination %</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {lotPerformance.map((entry) => (
                    <tr key={entry.seedLotId}>
                      <td>{entry.lotCode} ({entry.crop} — {entry.variety})</td>
                      <td>{entry.inspectionCount}</td>
                      <td>{entry.avgHealthScore ?? '—'}</td>
                      <td>{formatPercent(entry.diseaseIncidenceRate)}</td>
                      <td>{formatPercent(entry.avgGerminationRate)}</td>
                      <td><span className={`${styles.statusBadge} ${ratingClass(entry.performanceRating)}`}>{entry.performanceRating.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Breeder Performance</h2>
            <p className={styles.sectionSubtitle}>Every Certified lot traced back through its genealogy to the breeder organization that originated it.</p>
            {breederPerformance.length === 0 ? (
              <div className={styles.emptyState}>No traceable breeder data yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Breeder</th>
                    <th>Lots</th>
                    <th>Inspections</th>
                    <th>Avg Health</th>
                    <th>Disease %</th>
                    <th>Germination %</th>
                  </tr>
                </thead>
                <tbody>
                  {breederPerformance.map((entry) => (
                    <tr key={entry.breederOrganizationId}>
                      <td>{entry.breederOrganizationName}</td>
                      <td>{entry.lotCount}</td>
                      <td>{entry.inspectionCount}</td>
                      <td>{entry.avgHealthScore ?? '—'}</td>
                      <td>{formatPercent(entry.diseaseIncidenceRate)}</td>
                      <td>{formatPercent(entry.avgGerminationRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Environmental Adaptation</h2>
            <p className={styles.sectionSubtitle}>How each variety performs across the regions it was actually grown in.</p>
            {environmental.length === 0 ? (
              <div className={styles.emptyState}>No region-linked inspections yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Crop / Variety</th>
                    <th>Region</th>
                    <th>Inspections</th>
                    <th>Avg Health</th>
                    <th>Disease %</th>
                  </tr>
                </thead>
                <tbody>
                  {environmental.map((entry, index) => (
                    <tr key={`${entry.crop}-${entry.variety}-${entry.region}-${index}`}>
                      <td>{entry.crop} — {entry.variety}</td>
                      <td>{entry.region}</td>
                      <td>{entry.inspectionCount}</td>
                      <td>{entry.avgHealthScore ?? '—'}</td>
                      <td>{formatPercent(entry.diseaseIncidenceRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Record Field Inspection</h2>
          <form className={styles.form} onSubmit={handleRecord}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="inspLotId">Certified Seed Lot</label>
              <select id="inspLotId" className={styles.select} value={inspLotId} onChange={(e) => setInspLotId(e.target.value)}>
                <option value="">Select a lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.variety}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="inspFarmerId">Farmer (optional — links region)</label>
              <select id="inspFarmerId" className={styles.select} value={inspFarmerId} onChange={(e) => setInspFarmerId(e.target.value)}>
                <option value="">No farmer linked</option>
                {farmers.map((farmer) => (
                  <option key={farmer.id} value={farmer.id}>{farmer.name} ({farmer.region})</option>
                ))}
              </select>
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="inspHealthScore">Health Score (0-100)</label>
                <Input id="inspHealthScore" type="number" min="0" max="100" value={inspHealthScore} onChange={(e) => setInspHealthScore(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="inspDate">Inspection Date</label>
                <Input id="inspDate" type="date" value={inspDate} onChange={(e) => setInspDate(e.target.value)} />
              </div>
            </div>
            <label className={styles.checkboxRow} htmlFor="inspDiseaseDetected">
              <input
                id="inspDiseaseDetected"
                type="checkbox"
                checked={inspDiseaseDetected}
                onChange={(e) => setInspDiseaseDetected(e.target.checked)}
              />
              Disease Detected
            </label>
            {inspDiseaseDetected ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="inspDiseaseName">Disease Name</label>
                <Input id="inspDiseaseName" value={inspDiseaseName} onChange={(e) => setInspDiseaseName(e.target.value)} placeholder="e.g. Bacterial Leaf Blight" />
              </div>
            ) : null}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="inspNotes">Environmental Notes</label>
              <textarea id="inspNotes" className={styles.textarea} value={inspNotes} onChange={(e) => setInspNotes(e.target.value)} placeholder="Weather, soil, irrigation conditions observed…" />
            </div>
            <Button type="submit" leftIcon={ClipboardCheck} isLoading={submitting}>Record Inspection</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
