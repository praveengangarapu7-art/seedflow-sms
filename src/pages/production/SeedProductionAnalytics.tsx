import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Beaker, Percent, Sprout, TrendingUp } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  fetchAnalyticsDashboard,
  fetchSeedLots,
  login,
  recordGerminationTest,
  recordHarvestYield,
  type ProductionAnalyticsDashboard,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import { seedCropPlans } from './cropPlanningData';
import styles from './SeedProductionAnalytics.module.css';

// Validated (dataviz skill, all-pairs light+dark) categorical slots — fixed
// assignment, never cycled: slot1 blue for "input"-type series, slot2
// orange for "output"-type series.
const COLOR_SOWN = '#2a78d6';
const COLOR_HARVESTED = '#eb6834';
const COLOR_UTILIZATION = '#2a78d6';
const COLOR_GERMINATION = '#1baf7a';
const COLOR_FORECAST = '#eb6834';

function average(values: number[]): number | null {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
}

export default function SeedProductionAnalytics() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(1); // Breeder by default
  const [token, setToken] = useState<string | null>(null);
  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [dashboard, setDashboard] = useState<ProductionAnalyticsDashboard | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [growthRate, setGrowthRate] = useState('8');

  const [yieldLotId, setYieldLotId] = useState('');
  const [yieldSown, setYieldSown] = useState('');
  const [yieldHarvested, setYieldHarvested] = useState('');
  const [yieldError, setYieldError] = useState<string | null>(null);
  const [yieldSubmitting, setYieldSubmitting] = useState(false);

  const [germLotId, setGermLotId] = useState('');
  const [germSampleSize, setGermSampleSize] = useState('400');
  const [germCount, setGermCount] = useState('');
  const [germError, setGermError] = useState<string | null>(null);
  const [germSubmitting, setGermSubmitting] = useState(false);

  const loadAll = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const [lotsResult, dashboardResult] = await Promise.all([
        fetchSeedLots(accessToken),
        fetchAnalyticsDashboard(accessToken),
      ]);
      setLots(lotsResult);
      setDashboard(dashboardResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load production analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        await loadAll(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the analytics service');
        setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [accountIndex, loadAll]);

  const utilizationChartData = useMemo(
    () =>
      (dashboard?.utilization ?? [])
        .filter((entry) => entry.quantityTotal > 0)
        .map((entry) => ({ name: entry.lotCode, Utilization: entry.utilizationPercent })),
    [dashboard],
  );

  const yieldChartData = useMemo(
    () =>
      (dashboard?.yieldOutcomes ?? []).map((entry) => ({
        name: entry.lotCode,
        Sown: entry.totalSown,
        Harvested: entry.totalHarvested,
      })),
    [dashboard],
  );

  const germinationChartData = useMemo(
    () =>
      (dashboard?.germinationRates ?? []).map((entry) => ({
        name: entry.variety,
        'Germination %': entry.germinationRatePercent,
      })),
    [dashboard],
  );

  const avgUtilization = average((dashboard?.utilization ?? []).map((e) => e.utilizationPercent));
  const avgYieldRatio = average((dashboard?.yieldOutcomes ?? []).flatMap((e) => (e.yieldRatio != null ? [e.yieldRatio] : [])));
  const avgGermination = average((dashboard?.germinationRates ?? []).map((e) => e.germinationRatePercent));
  const avgMultiplication = average(
    (dashboard?.breedingEffectiveness ?? []).flatMap((e) => (e.multiplicationRatio != null ? [e.multiplicationRatio] : [])),
  );

  const forecastData = useMemo(() => {
    const rate = Number(growthRate) / 100;
    const byCrop = new Map<string, number>();
    seedCropPlans.forEach((plan) => {
      if (!plan.targetYield) return;
      byCrop.set(plan.crop, (byCrop.get(plan.crop) ?? 0) + plan.targetYield);
    });
    return Array.from(byCrop.entries()).map(([crop, current]) => ({
      name: crop,
      Current: current,
      Projected: Number.isFinite(rate) ? Math.round(current * (1 + rate)) : current,
    }));
  }, [growthRate]);

  const handleRecordYield = async (event: React.FormEvent) => {
    event.preventDefault();
    setYieldError(null);
    if (!token) return;
    if (!yieldLotId) {
      setYieldError('Select a seed lot.');
      return;
    }
    const sown = Number(yieldSown);
    const harvested = Number(yieldHarvested);
    if (!yieldSown || Number.isNaN(sown) || sown <= 0) {
      setYieldError('Sown quantity must be a positive number.');
      return;
    }
    if (!yieldHarvested || Number.isNaN(harvested) || harvested < 0) {
      setYieldError('Harvested quantity must be a non-negative number.');
      return;
    }

    setYieldSubmitting(true);
    try {
      await recordHarvestYield(token, { seedLotId: yieldLotId, sownQuantity: sown, harvestedQuantity: harvested });
      addToast('Harvest yield recorded', 'success');
      setYieldSown('');
      setYieldHarvested('');
      await loadAll(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to record harvest yield';
      setYieldError(message);
      addToast(message, 'error');
    } finally {
      setYieldSubmitting(false);
    }
  };

  const handleRecordGermination = async (event: React.FormEvent) => {
    event.preventDefault();
    setGermError(null);
    if (!token) return;
    if (!germLotId) {
      setGermError('Select a seed lot.');
      return;
    }
    const sampleSize = Number(germSampleSize);
    const germinated = Number(germCount);
    if (!germSampleSize || !Number.isInteger(sampleSize) || sampleSize <= 0) {
      setGermError('Sample size must be a positive whole number.');
      return;
    }
    if (!germCount || !Number.isInteger(germinated) || germinated < 0) {
      setGermError('Germinated count must be a non-negative whole number.');
      return;
    }
    if (germinated > sampleSize) {
      setGermError('Germinated count cannot exceed the sample size.');
      return;
    }

    setGermSubmitting(true);
    try {
      await recordGerminationTest(token, { seedLotId: germLotId, sampleSize, germinatedCount: germinated });
      addToast('Germination test recorded', 'success');
      setGermCount('');
      await loadAll(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to record germination test';
      setGermError(message);
      addToast(message, 'error');
    } finally {
      setGermSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Production Analytics &amp; KPIs</h1>
          <p className={styles.subtitle}>Utilization, yield outcomes, germination quality, and breeding effectiveness — computed from real seed lot data.</p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => token && loadAll(token)} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.kpiRow}>
        <KpiCard title="Avg. Seed Lot Utilization" value={avgUtilization != null ? `${avgUtilization.toFixed(1)}%` : '—'} icon={Percent} />
        <KpiCard title="Avg. Yield Ratio (harvest/seed)" value={avgYieldRatio != null ? `${avgYieldRatio.toFixed(1)}x` : '—'} icon={TrendingUp} />
        <KpiCard title="Avg. Germination Rate" value={avgGermination != null ? `${avgGermination.toFixed(1)}%` : '—'} icon={Beaker} />
        <KpiCard title="Avg. Multiplication Ratio" value={avgMultiplication != null ? `${avgMultiplication.toFixed(1)}x` : '—'} icon={Sprout} />
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Seed Lot Utilization</h2>
            <p className={styles.sectionSubtitle}>% of each lot's quantity currently allocated.</p>
            {utilizationChartData.length === 0 ? (
              <div className={styles.emptyState}>No seed lots with recorded quantity yet.</div>
            ) : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilizationChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8efe8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Utilization']} />
                    <Bar dataKey="Utilization" fill={COLOR_UTILIZATION} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Yield Outcomes per Seed Lot</h2>
            <p className={styles.sectionSubtitle}>Recorded sown vs. harvested quantity.</p>
            {yieldChartData.length === 0 ? (
              <div className={styles.emptyState}>No harvest yields recorded yet.</div>
            ) : (
              <>
                <div className={styles.legend}>
                  <span className={styles.legendItem}><span className={styles.legendSwatch} style={{ background: COLOR_SOWN }} />Sown</span>
                  <span className={styles.legendItem}><span className={styles.legendSwatch} style={{ background: COLOR_HARVESTED }} />Harvested</span>
                </div>
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yieldChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8efe8" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="Sown" fill={COLOR_SOWN} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Harvested" fill={COLOR_HARVESTED} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Germination Success Rate by Variety</h2>
            <p className={styles.sectionSubtitle}>Aggregated across all recorded lab/field germination tests.</p>
            {germinationChartData.length === 0 ? (
              <div className={styles.emptyState}>No germination tests recorded yet.</div>
            ) : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={germinationChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8efe8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Germination']} />
                    <Bar dataKey="Germination %" fill={COLOR_GERMINATION} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Next-Season Demand Forecast</h2>
            <p className={styles.sectionSubtitle}>
              Projects each crop's target yield forward from current crop-planning trends under an adjustable growth assumption — a scenario tool, not a precise prediction.
            </p>
            <div className={styles.forecastRow}>
              <label className={styles.label} htmlFor="growthRate">Assumed seasonal growth</label>
              <Input
                id="growthRate"
                type="number"
                step="1"
                value={growthRate}
                onChange={(e) => setGrowthRate(e.target.value)}
                style={{ width: '90px' }}
              />
              <span>%</span>
            </div>
            {forecastData.length === 0 ? (
              <div className={styles.emptyState}>No crop plan data available to forecast from.</div>
            ) : (
              <>
                <div className={styles.legend}>
                  <span className={styles.legendItem}><span className={styles.legendSwatch} style={{ background: COLOR_UTILIZATION }} />Current target</span>
                  <span className={styles.legendItem}><span className={styles.legendSwatch} style={{ background: COLOR_FORECAST }} />Projected next season</span>
                </div>
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8efe8" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="Current" fill={COLOR_UTILIZATION} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Projected" fill={COLOR_FORECAST} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Breeding Effectiveness</h2>
            <p className={styles.sectionSubtitle}>Seed produced per unit allocated to multiplication, by stage transition.</p>
            {(dashboard?.breedingEffectiveness ?? []).length === 0 ? (
              <div className={styles.emptyState}>No parent-child seed lots yet.</div>
            ) : (
              dashboard!.breedingEffectiveness.map((entry) => (
                <div key={entry.parentLotId} className={styles.ratioCard}>
                  <div className={styles.ratioHeadline}>
                    {entry.parentStage} → {entry.childStage}: {entry.multiplicationRatio != null ? `${entry.multiplicationRatio}x` : 'n/a'}
                  </div>
                  <div className={styles.ratioMeta}>
                    {entry.parentLotCode} allocated {entry.parentQuantityAllocated.toLocaleString()} → {entry.childrenQuantityTotal.toLocaleString()} produced across {entry.childLotCodes.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Record Harvest Yield</h2>
            <form className={styles.form} onSubmit={handleRecordYield}>
              {yieldError ? <span className={styles.errorText}>{yieldError}</span> : null}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="yieldLotId">Seed Lot</label>
                <select id="yieldLotId" className={styles.select} value={yieldLotId} onChange={(e) => setYieldLotId(e.target.value)}>
                  <option value="">Select a seed lot</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.stage}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="yieldSown">Sown Quantity</label>
                  <Input id="yieldSown" type="number" min="0" value={yieldSown} onChange={(e) => setYieldSown(e.target.value)} placeholder="e.g. 500" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="yieldHarvested">Harvested Quantity</label>
                  <Input id="yieldHarvested" type="number" min="0" value={yieldHarvested} onChange={(e) => setYieldHarvested(e.target.value)} placeholder="e.g. 2300" />
                </div>
              </div>
              <Button type="submit" isLoading={yieldSubmitting}>Record Yield</Button>
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Record Germination Test</h2>
            <form className={styles.form} onSubmit={handleRecordGermination}>
              {germError ? <span className={styles.errorText}>{germError}</span> : null}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="germLotId">Seed Lot</label>
                <select id="germLotId" className={styles.select} value={germLotId} onChange={(e) => setGermLotId(e.target.value)}>
                  <option value="">Select a seed lot</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.variety}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="germSampleSize">Sample Size</label>
                  <Input id="germSampleSize" type="number" min="1" value={germSampleSize} onChange={(e) => setGermSampleSize(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="germCount">Germinated Count</label>
                  <Input id="germCount" type="number" min="0" value={germCount} onChange={(e) => setGermCount(e.target.value)} placeholder="e.g. 360" />
                </div>
              </div>
              <Button type="submit" isLoading={germSubmitting}>Record Test</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
