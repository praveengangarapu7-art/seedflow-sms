import { useCallback, useEffect, useState } from 'react';
import { CloudRain, RefreshCw, ShieldAlert, Sprout, TrendingUp } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  WEATHER_OUTLOOK_VALUES,
  fetchBreedingPriorityRecommendations,
  fetchCropInsuranceRecords,
  fetchLatestDemandForecasts,
  fetchMarketPrices,
  fetchMinistryForecasts,
  fetchWeatherOutlooks,
  generateDemandForecast,
  login,
  recordCropInsurance,
  recordMarketPrice,
  recordMinistryForecast,
  recordWeatherOutlook,
  type BreedingPriorityRecommendation,
  type CropInsuranceRecord,
  type MarketPriceObservation,
  type MinistryDemandForecast,
  type VarietyDemandForecast,
  type WeatherOutlookRecord,
  type WeatherOutlookValue,
} from '@/services/seedLotRealtimeClient';
import styles from './MarketIntelligence.module.css';

const MARKET_DATA_ROLES = new Set(['Admin', 'Breeder']);
type Tab = 'forecasts' | 'market-data' | 'breeding-priority';

function actionBadgeClass(action: string): string {
  const key = `action${action.charAt(0).toUpperCase()}${action.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function MarketIntelligence() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);
  const [tab, setTab] = useState<Tab>('forecasts');
  const [season, setSeason] = useState('2026-Kharif');

  const [forecasts, setForecasts] = useState<VarietyDemandForecast[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<VarietyDemandForecast | null>(null);
  const [newForecast, setNewForecast] = useState({ crop: '', variety: '' });

  const [prices, setPrices] = useState<MarketPriceObservation[]>([]);
  const [newPrice, setNewPrice] = useState({ crop: '', variety: '', region: '', pricePerUnit: '', observedDate: '', source: '' });

  const [ministryForecasts, setMinistryForecasts] = useState<MinistryDemandForecast[]>([]);
  const [newMinistry, setNewMinistry] = useState({ crop: '', variety: '', forecastedDemandQuantity: '', issuingAuthority: '', publishedDate: '' });

  const [weatherOutlooks, setWeatherOutlooks] = useState<WeatherOutlookRecord[]>([]);
  const [newWeather, setNewWeather] = useState({ region: '', crop: '', outlook: 'normal' as WeatherOutlookValue, issuingAuthority: '' });

  const [insuranceRecords, setInsuranceRecords] = useState<CropInsuranceRecord[]>([]);
  const [newInsurance, setNewInsurance] = useState({ crop: '', variety: '', claimsCount: '', totalClaimAmount: '' });

  const [priorities, setPriorities] = useState<BreedingPriorityRecommendation[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async (accessToken: string, currentSeason: string) => {
    setError(null);
    try {
      const [latest, priceList, ministryList, weatherList, insuranceList] = await Promise.all([
        fetchLatestDemandForecasts(accessToken, currentSeason),
        fetchMarketPrices(accessToken),
        fetchMinistryForecasts(accessToken),
        fetchWeatherOutlooks(accessToken),
        fetchCropInsuranceRecords(accessToken),
      ]);
      setForecasts(latest);
      setPrices(priceList);
      setMinistryForecasts(ministryList);
      setWeatherOutlooks(weatherList);
      setInsuranceRecords(insuranceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load market intelligence data');
    }
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
        setRole(account.role);
        await loadAll(accessToken, season);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the market intelligence service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleRefresh = () => {
    if (token) void loadAll(token, season);
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateForecast = () =>
    withBusy(async () => {
      if (!token || !newForecast.crop.trim() || !newForecast.variety.trim() || !season.trim()) {
        setError('Crop, variety, and season are all required.');
        return;
      }
      const forecast = await generateDemandForecast(token, newForecast.crop.trim(), newForecast.variety.trim(), season.trim());
      setMessage(`Forecast generated: ${forecast.crop} / ${forecast.variety} scored ${forecast.demand_score}/100 (${forecast.recommended_action.replace('_', ' ')}).`);
      setNewForecast({ crop: '', variety: '' });
      await loadAll(token, season);
    });

  const handleRecordPrice = () =>
    withBusy(async () => {
      if (!token || !newPrice.crop.trim() || !newPrice.pricePerUnit || !newPrice.observedDate || !newPrice.source.trim()) {
        setError('Crop, price, observed date, and source are required.');
        return;
      }
      await recordMarketPrice(token, {
        crop: newPrice.crop.trim(),
        variety: newPrice.variety.trim() || undefined,
        region: newPrice.region.trim() || undefined,
        pricePerUnit: Number(newPrice.pricePerUnit),
        observedDate: newPrice.observedDate,
        source: newPrice.source.trim(),
      });
      setMessage('Market price recorded.');
      setNewPrice({ crop: '', variety: '', region: '', pricePerUnit: '', observedDate: '', source: '' });
      await loadAll(token, season);
    });

  const handleRecordMinistry = () =>
    withBusy(async () => {
      if (!token || !newMinistry.crop.trim() || !newMinistry.forecastedDemandQuantity || !newMinistry.issuingAuthority.trim() || !newMinistry.publishedDate) {
        setError('Crop, forecasted quantity, issuing authority, and published date are required.');
        return;
      }
      await recordMinistryForecast(token, {
        crop: newMinistry.crop.trim(),
        variety: newMinistry.variety.trim() || undefined,
        season: season.trim(),
        forecastedDemandQuantity: Number(newMinistry.forecastedDemandQuantity),
        issuingAuthority: newMinistry.issuingAuthority.trim(),
        publishedDate: newMinistry.publishedDate,
      });
      setMessage('Ministry demand forecast recorded.');
      setNewMinistry({ crop: '', variety: '', forecastedDemandQuantity: '', issuingAuthority: '', publishedDate: '' });
      await loadAll(token, season);
    });

  const handleRecordWeather = () =>
    withBusy(async () => {
      if (!token || !newWeather.region.trim() || !newWeather.issuingAuthority.trim()) {
        setError('Region and issuing authority are required.');
        return;
      }
      await recordWeatherOutlook(token, {
        region: newWeather.region.trim(),
        crop: newWeather.crop.trim() || undefined,
        season: season.trim(),
        outlook: newWeather.outlook,
        issuingAuthority: newWeather.issuingAuthority.trim(),
      });
      setMessage('Weather outlook recorded.');
      setNewWeather({ region: '', crop: '', outlook: 'normal', issuingAuthority: '' });
      await loadAll(token, season);
    });

  const handleRecordInsurance = () =>
    withBusy(async () => {
      if (!token || !newInsurance.crop.trim() || !newInsurance.claimsCount || !newInsurance.totalClaimAmount) {
        setError('Crop, claims count, and total claim amount are required.');
        return;
      }
      await recordCropInsurance(token, {
        crop: newInsurance.crop.trim(),
        variety: newInsurance.variety.trim() || undefined,
        season: season.trim(),
        claimsCount: Number(newInsurance.claimsCount),
        totalClaimAmount: Number(newInsurance.totalClaimAmount),
      });
      setMessage('Crop insurance record recorded.');
      setNewInsurance({ crop: '', variety: '', claimsCount: '', totalClaimAmount: '' });
      await loadAll(token, season);
    });

  const handleLoadPriorities = () =>
    withBusy(async () => {
      if (!token) return;
      const data = await fetchBreedingPriorityRecommendations(token, season);
      setPriorities(data);
      if (data.length === 0) setMessage('No demand forecasts exist yet for this season — generate one first.');
    });

  const canRecord = MARKET_DATA_ROLES.has(role);
  const topForecast = forecasts[0] ?? null;
  const increaseCount = forecasts.filter((f) => f.recommended_action === 'increase_production').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Market Intelligence &amp; Demand Forecasting</h1>
          <p className={styles.subtitle}>
            Record price trends, ministry demand forecasts, weather outlooks, and crop insurance data, then generate a
            transparent, explainable demand score per variety — every contributing signal and its weight is shown, not
            hidden behind a black box — to guide breeding priorities and suggested pricing.
          </p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <input className={styles.textInput} style={{ minWidth: 140 }} placeholder="Season (e.g. 2026-Kharif)" value={season} onChange={(e) => setSeason(e.target.value)} />
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KpiCard title="Varieties Forecasted" value={String(forecasts.length)} icon={TrendingUp} />
        <KpiCard title="Recommend Increasing" value={String(increaseCount)} icon={Sprout} />
        <KpiCard title="Top Variety This Season" value={topForecast ? `${topForecast.variety} (${topForecast.demand_score})` : '—'} icon={TrendingUp} />
        <KpiCard title="Weather Outlooks Recorded" value={String(weatherOutlooks.length)} icon={CloudRain} />
      </div>

      <div className={styles.tabBar}>
        {(['forecasts', 'market-data', 'breeding-priority'] as Tab[]).map((t) => (
          <button key={t} className={`${styles.tabButton} ${tab === t ? styles.tabButtonActive : ''}`} onClick={() => setTab(t)}>
            {t.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {tab === 'forecasts' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Demand Forecasts — {season || 'select a season'}</h2>
            <p className={styles.sectionSubtitle}>Ranked by demand score. Click a row to see exactly which signals produced it.</p>
            {canRecord && (
              <div className={styles.formRow}>
                <input className={styles.textInput} placeholder="Crop" value={newForecast.crop} onChange={(e) => setNewForecast((f) => ({ ...f, crop: e.target.value }))} />
                <input className={styles.textInput} placeholder="Variety" value={newForecast.variety} onChange={(e) => setNewForecast((f) => ({ ...f, variety: e.target.value }))} />
                <Button size="sm" isLoading={busy} onClick={() => void handleGenerateForecast()}>Generate Forecast</Button>
              </div>
            )}
            {forecasts.length === 0 ? (
              <div className={styles.emptyState}>No forecasts generated yet for this season.</div>
            ) : (
              <table className={styles.table}>
                <thead><tr><th>Crop</th><th>Variety</th><th>Score</th><th>Action</th><th>Suggested Price</th></tr></thead>
                <tbody>
                  {forecasts.map((f) => (
                    <tr key={f.id} className={styles.clickableRow} onClick={() => setSelectedForecast(f)}>
                      <td>{f.crop}</td>
                      <td>{f.variety}</td>
                      <td>{f.demand_score}</td>
                      <td><span className={`${styles.actionBadge} ${actionBadgeClass(f.recommended_action)}`}>{f.recommended_action.replace('_', ' ')}</span></td>
                      <td>{f.suggested_price_per_unit != null ? `${f.suggested_price_per_unit}/${f.unit}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Signal Breakdown</h2>
            {!selectedForecast ? (
              <div className={styles.emptyState}>Click a forecast row to see what drove its score.</div>
            ) : (
              <>
                <p className={styles.sectionSubtitle}>{selectedForecast.crop} / {selectedForecast.variety} — {selectedForecast.demand_score}/100</p>
                {selectedForecast.signals_breakdown.length === 0 ? (
                  <div className={styles.emptyState}>No market signals were available — this forecast defaulted to a neutral 50.</div>
                ) : (
                  selectedForecast.signals_breakdown.map((s) => (
                    <div key={s.signal} className={styles.breakdownBar}>
                      <span style={{ width: 140, flexShrink: 0 }}>{s.signal} (w={s.weight})</span>
                      <div className={styles.breakdownTrack}>
                        <div
                          className={styles.breakdownFill}
                          style={{
                            left: s.deviation >= 0 ? '50%' : `${50 + (s.deviation / 50) * 50}%`,
                            right: s.deviation >= 0 ? `${50 - (s.deviation / 50) * 50}%` : '50%',
                            background: s.deviation >= 0 ? '#187a43' : '#c0392b',
                          }}
                        />
                      </div>
                      <span style={{ width: 50, textAlign: 'right', flexShrink: 0 }}>{s.deviation > 0 ? '+' : ''}{s.deviation}</span>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'market-data' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Market Price Observations</h2>
            {canRecord && (
              <>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Crop" value={newPrice.crop} onChange={(e) => setNewPrice((p) => ({ ...p, crop: e.target.value }))} />
                  <input className={styles.textInput} placeholder="Variety (optional)" value={newPrice.variety} onChange={(e) => setNewPrice((p) => ({ ...p, variety: e.target.value }))} />
                  <input className={styles.numberInput} type="number" placeholder="Price/unit" value={newPrice.pricePerUnit} onChange={(e) => setNewPrice((p) => ({ ...p, pricePerUnit: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <input className={styles.textInput} type="date" value={newPrice.observedDate} onChange={(e) => setNewPrice((p) => ({ ...p, observedDate: e.target.value }))} />
                  <input className={styles.textInput} placeholder="Source (e.g. State Mandi Bulletin)" value={newPrice.source} onChange={(e) => setNewPrice((p) => ({ ...p, source: e.target.value }))} />
                  <Button size="sm" isLoading={busy} onClick={() => void handleRecordPrice()}>Record</Button>
                </div>
              </>
            )}
            {prices.length === 0 ? (
              <div className={styles.emptyState}>No price observations recorded yet.</div>
            ) : (
              prices.slice(0, 10).map((p) => (
                <div key={p.id} className={styles.row}>
                  <div>
                    <strong>{p.crop}{p.variety ? ` / ${p.variety}` : ''}</strong>
                    <div className={styles.rowMeta}>{p.price_per_unit}/{p.unit} on {new Date(p.observed_date).toLocaleDateString()} — {p.source}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Ministry Demand Forecasts</h2>
            {canRecord && (
              <>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Crop" value={newMinistry.crop} onChange={(e) => setNewMinistry((m) => ({ ...m, crop: e.target.value }))} />
                  <input className={styles.textInput} placeholder="Variety (optional)" value={newMinistry.variety} onChange={(e) => setNewMinistry((m) => ({ ...m, variety: e.target.value }))} />
                  <input className={styles.numberInput} type="number" placeholder="Quantity" value={newMinistry.forecastedDemandQuantity} onChange={(e) => setNewMinistry((m) => ({ ...m, forecastedDemandQuantity: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Issuing authority" value={newMinistry.issuingAuthority} onChange={(e) => setNewMinistry((m) => ({ ...m, issuingAuthority: e.target.value }))} />
                  <input className={styles.textInput} type="date" value={newMinistry.publishedDate} onChange={(e) => setNewMinistry((m) => ({ ...m, publishedDate: e.target.value }))} />
                  <Button size="sm" isLoading={busy} onClick={() => void handleRecordMinistry()}>Record</Button>
                </div>
              </>
            )}
            {ministryForecasts.length === 0 ? (
              <div className={styles.emptyState}>No ministry forecasts recorded yet.</div>
            ) : (
              ministryForecasts.slice(0, 10).map((m) => (
                <div key={m.id} className={styles.row}>
                  <div>
                    <strong>{m.crop}{m.variety ? ` / ${m.variety}` : ''}</strong>
                    <div className={styles.rowMeta}>{m.forecasted_demand_quantity} {m.unit} · {m.season} · {m.issuing_authority}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Weather Outlooks</h2>
            {canRecord && (
              <>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Region" value={newWeather.region} onChange={(e) => setNewWeather((w) => ({ ...w, region: e.target.value }))} />
                  <input className={styles.textInput} placeholder="Crop (optional)" value={newWeather.crop} onChange={(e) => setNewWeather((w) => ({ ...w, crop: e.target.value }))} />
                  <select className={styles.select} value={newWeather.outlook} onChange={(e) => setNewWeather((w) => ({ ...w, outlook: e.target.value as WeatherOutlookValue }))}>
                    {WEATHER_OUTLOOK_VALUES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Issuing authority" value={newWeather.issuingAuthority} onChange={(e) => setNewWeather((w) => ({ ...w, issuingAuthority: e.target.value }))} />
                  <Button size="sm" isLoading={busy} onClick={() => void handleRecordWeather()}>Record</Button>
                </div>
              </>
            )}
            {weatherOutlooks.length === 0 ? (
              <div className={styles.emptyState}>No weather outlooks recorded yet.</div>
            ) : (
              weatherOutlooks.slice(0, 10).map((w) => (
                <div key={w.id} className={styles.row}>
                  <div>
                    <strong>{w.region}{w.crop ? ` — ${w.crop}` : ''}</strong>
                    <div className={styles.rowMeta}>{w.outlook} · {w.season} · {w.issuing_authority}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Crop Insurance Records</h2>
            {canRecord && (
              <>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Crop" value={newInsurance.crop} onChange={(e) => setNewInsurance((i) => ({ ...i, crop: e.target.value }))} />
                  <input className={styles.textInput} placeholder="Variety (optional)" value={newInsurance.variety} onChange={(e) => setNewInsurance((i) => ({ ...i, variety: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <input className={styles.numberInput} type="number" placeholder="Claims count" value={newInsurance.claimsCount} onChange={(e) => setNewInsurance((i) => ({ ...i, claimsCount: e.target.value }))} />
                  <input className={styles.numberInput} type="number" placeholder="Total claim amt" value={newInsurance.totalClaimAmount} onChange={(e) => setNewInsurance((i) => ({ ...i, totalClaimAmount: e.target.value }))} />
                  <Button size="sm" leftIcon={ShieldAlert} isLoading={busy} onClick={() => void handleRecordInsurance()}>Record</Button>
                </div>
              </>
            )}
            {insuranceRecords.length === 0 ? (
              <div className={styles.emptyState}>No insurance records recorded yet.</div>
            ) : (
              insuranceRecords.slice(0, 10).map((i) => (
                <div key={i.id} className={styles.row}>
                  <div>
                    <strong>{i.crop}{i.variety ? ` / ${i.variety}` : ''}</strong>
                    <div className={styles.rowMeta}>{i.claims_count} claims · {i.total_claim_amount} total · {i.season}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'breeding-priority' && (
        <div className={styles.card}>
          <div className={styles.formRow}>
            <Button size="sm" isLoading={busy} onClick={() => void handleLoadPriorities()}>Load Recommendations for {season || 'this season'}</Button>
          </div>
          <p className={styles.sectionSubtitle}>
            Compares each variety's live demand forecast against what's actually being planned right now — not a stored
            snapshot, since crop plans change daily.
          </p>
          {priorities.length === 0 ? (
            <div className={styles.emptyState}>Click "Load Recommendations" to compare demand forecasts against current breeding plans.</div>
          ) : (
            priorities.map((p) => (
              <div key={`${p.crop}::${p.variety}`} className={styles.row}>
                <div>
                  <strong>{p.crop} / {p.variety}</strong>
                  <span className={`${styles.actionBadge} ${actionBadgeClass(p.recommendedAction)}`} style={{ marginLeft: '0.5rem' }}>
                    {p.recommendedAction.replace('_', ' ')}
                  </span>
                  <div className={styles.rowMeta}>
                    Score {p.demandScore} · {p.activeCropPlanCount} active crop plan(s) · {p.currentCertifiedSupply.toLocaleString()} units Certified stock
                  </div>
                  <div className={styles.rowMeta}>{p.priorityNote}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
