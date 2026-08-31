import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CloudRain, Leaf, RefreshCw, Sprout } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  PRIMARY_RISK_FACTORS,
  RISK_LEVELS,
  OUTCOME_RATINGS,
  SOIL_TYPES,
  acknowledgeClimateRiskAlert,
  createFarm,
  fetchAdaptationOutcomes,
  fetchClimatePredictions,
  fetchClimateRiskAlerts,
  fetchClimateSmartRecommendations,
  fetchCropRotationSuggestions,
  fetchFarmers,
  fetchFarms,
  fetchVarieties,
  login,
  recordAdaptationOutcome,
  recordClimatePrediction,
  type AdaptationOutcome,
  type ClimatePrediction,
  type ClimateRiskAlert,
  type ClimateSmartRecommendation,
  type CropRotationSuggestion,
  type Farm,
  type FarmerRow,
  type IrrigationType,
  type OutcomeRating,
  type PrimaryRiskFactor,
  type RiskLevel,
  type SoilType,
  type VarietyWithLatestVersion,
} from '@/services/seedLotRealtimeClient';
import styles from './ClimateSmartSelection.module.css';

const CLIMATE_DATA_ROLES = new Set(['Admin', 'Breeder']);
type Tab = 'recommendations' | 'climate-data' | 'outcomes';

function riskBadgeClass(risk: string): string {
  const key = `risk${risk.charAt(0).toUpperCase()}${risk.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function ClimateSmartSelection() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);
  const [tab, setTab] = useState<Tab>('recommendations');

  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [varieties, setVarieties] = useState<VarietyWithLatestVersion[]>([]);
  const [predictions, setPredictions] = useState<ClimatePrediction[]>([]);
  const [alerts, setAlerts] = useState<ClimateRiskAlert[]>([]);
  const [outcomes, setOutcomes] = useState<AdaptationOutcome[]>([]);

  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [recoCrop, setRecoCrop] = useState('');
  const [recommendations, setRecommendations] = useState<ClimateSmartRecommendation[] | null>(null);
  const [rotationSuggestions, setRotationSuggestions] = useState<CropRotationSuggestion[] | null>(null);
  const [newFarm, setNewFarm] = useState({ name: '', soilType: 'loamy' as SoilType, areaAcres: '', irrigationType: '' as IrrigationType | '' });

  const [newPrediction, setNewPrediction] = useState({
    region: '', season: '', predictedRainfallMm: '', predictedAvgTempCelsius: '',
    riskLevel: 'low' as RiskLevel, primaryRiskFactor: '' as PrimaryRiskFactor | '', source: '',
  });

  const [newOutcome, setNewOutcome] = useState({ farmId: '', varietyId: '', crop: '', season: '', actualYieldPerAcre: '', outcomeRating: 'good' as OutcomeRating });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async (accessToken: string) => {
    setError(null);
    try {
      const [farmerList, predictionList, alertList, outcomeList] = await Promise.all([
        fetchFarmers(accessToken),
        fetchClimatePredictions(accessToken),
        fetchClimateRiskAlerts(accessToken),
        fetchAdaptationOutcomes(accessToken),
      ]);
      setFarmers(farmerList);
      setPredictions(predictionList);
      setAlerts(alertList);
      setOutcomes(outcomeList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load climate-smart selection data');
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
        await loadAll(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the climate-smart selection service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (!token || !selectedFarmerId) {
      setFarms([]);
      setSelectedFarmId('');
      return;
    }
    fetchFarms(token, selectedFarmerId).then(setFarms).catch(() => setFarms([]));
  }, [token, selectedFarmerId]);

  useEffect(() => {
    if (!token || !recoCrop.trim()) {
      setVarieties([]);
      return;
    }
    fetchVarieties(token, { crop: recoCrop.trim() }).then(setVarieties).catch(() => setVarieties([]));
  }, [token, recoCrop]);

  const handleRefresh = () => {
    if (token) void loadAll(token);
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

  const handleCreateFarm = () =>
    withBusy(async () => {
      if (!token || !selectedFarmerId || !newFarm.name.trim() || !newFarm.areaAcres) {
        setError('Select a farmer, and fill in farm name and area.');
        return;
      }
      await createFarm(token, {
        farmerId: selectedFarmerId,
        name: newFarm.name.trim(),
        soilType: newFarm.soilType,
        areaAcres: Number(newFarm.areaAcres),
        irrigationType: newFarm.irrigationType || undefined,
      });
      setMessage('Farm created.');
      setNewFarm({ name: '', soilType: 'loamy', areaAcres: '', irrigationType: '' });
      setFarms(await fetchFarms(token, selectedFarmerId));
    });

  const handleGetRecommendations = () =>
    withBusy(async () => {
      if (!token || !selectedFarmerId || !selectedFarmId || !recoCrop.trim()) {
        setError('Select a farmer, a farm, and a crop.');
        return;
      }
      const recos = await fetchClimateSmartRecommendations(token, selectedFarmerId, selectedFarmId, recoCrop.trim());
      setRecommendations(recos);
      const rotation = await fetchCropRotationSuggestions(token, selectedFarmId);
      setRotationSuggestions(rotation);
    });

  const handleRecordPrediction = () =>
    withBusy(async () => {
      if (!token || !newPrediction.region.trim() || !newPrediction.season.trim() || !newPrediction.source.trim()) {
        setError('Region, season, and source are required.');
        return;
      }
      await recordClimatePrediction(token, {
        region: newPrediction.region.trim(),
        season: newPrediction.season.trim(),
        predictedRainfallMm: newPrediction.predictedRainfallMm ? Number(newPrediction.predictedRainfallMm) : undefined,
        predictedAvgTempCelsius: newPrediction.predictedAvgTempCelsius ? Number(newPrediction.predictedAvgTempCelsius) : undefined,
        riskLevel: newPrediction.riskLevel,
        primaryRiskFactor: newPrediction.primaryRiskFactor || undefined,
        source: newPrediction.source.trim(),
      });
      setMessage('Climate prediction recorded.' + (['high', 'severe'].includes(newPrediction.riskLevel) ? ' Risk alerts sent to affected farms.' : ''));
      setNewPrediction({ region: '', season: '', predictedRainfallMm: '', predictedAvgTempCelsius: '', riskLevel: 'low', primaryRiskFactor: '', source: '' });
      await loadAll(token);
    });

  const handleAcknowledge = (alertId: string) =>
    withBusy(async () => {
      if (!token) return;
      await acknowledgeClimateRiskAlert(token, alertId);
      setAlerts(await fetchClimateRiskAlerts(token));
    });

  const handleRecordOutcome = () =>
    withBusy(async () => {
      if (!token || !newOutcome.farmId || !newOutcome.varietyId || !newOutcome.crop.trim() || !newOutcome.season.trim()) {
        setError('Farm, variety, crop, and season are all required.');
        return;
      }
      await recordAdaptationOutcome(token, {
        farmId: newOutcome.farmId,
        varietyId: newOutcome.varietyId,
        crop: newOutcome.crop.trim(),
        season: newOutcome.season.trim(),
        actualYieldPerAcre: newOutcome.actualYieldPerAcre ? Number(newOutcome.actualYieldPerAcre) : undefined,
        outcomeRating: newOutcome.outcomeRating,
      });
      setMessage('Adaptation outcome recorded.');
      setNewOutcome({ farmId: '', varietyId: '', crop: '', season: '', actualYieldPerAcre: '', outcomeRating: 'good' });
      setOutcomes(await fetchAdaptationOutcomes(token));
    });

  const canRecord = CLIMATE_DATA_ROLES.has(role);
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const highRiskCount = predictions.filter((p) => p.risk_level === 'high' || p.risk_level === 'severe').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Climate-Smart Seed Selection Engine</h1>
          <p className={styles.subtitle}>
            Recommend varieties by climate resilience on top of the existing farm/soil/history-aware crop planning
            engine, suggest crop rotations, alert farms to predicted climate risk in real time, and track how
            recommendations actually performed.
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
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KpiCard title="Climate Predictions Recorded" value={String(predictions.length)} icon={CloudRain} />
        <KpiCard title="High/Severe Risk Predictions" value={String(highRiskCount)} icon={AlertTriangle} />
        <KpiCard title="Unacknowledged Alerts" value={String(unacknowledgedCount)} icon={AlertTriangle} />
        <KpiCard title="Adaptation Outcomes Tracked" value={String(outcomes.length)} icon={Sprout} />
      </div>

      <div className={styles.tabBar}>
        {(['recommendations', 'climate-data', 'outcomes'] as Tab[]).map((t) => (
          <button key={t} className={`${styles.tabButton} ${tab === t ? styles.tabButtonActive : ''}`} onClick={() => setTab(t)}>
            {t === 'recommendations' ? 'Recommendations & Rotation' : t === 'climate-data' ? 'Climate Data & Alerts' : 'Adaptation Outcomes'}
          </button>
        ))}
      </div>

      {tab === 'recommendations' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Get Climate-Smart Recommendations</h2>
            <div className={styles.formRow}>
              <select className={styles.select} value={selectedFarmerId} onChange={(e) => setSelectedFarmerId(e.target.value)}>
                <option value="">Select a farmer</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.region})</option>
                ))}
              </select>
              <select className={styles.select} value={selectedFarmId} onChange={(e) => setSelectedFarmId(e.target.value)}>
                <option value="">Select a farm</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} — {f.soil_type}</option>
                ))}
              </select>
            </div>
            {selectedFarmerId && farms.length === 0 && (
              <div className={styles.formRow}>
                <input className={styles.textInput} placeholder="New farm name" value={newFarm.name} onChange={(e) => setNewFarm((f) => ({ ...f, name: e.target.value }))} />
                <select className={styles.select} value={newFarm.soilType} onChange={(e) => setNewFarm((f) => ({ ...f, soilType: e.target.value as SoilType }))}>
                  {SOIL_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input className={styles.numberInput} type="number" placeholder="Acres" value={newFarm.areaAcres} onChange={(e) => setNewFarm((f) => ({ ...f, areaAcres: e.target.value }))} />
                <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleCreateFarm()}>Create Farm</Button>
              </div>
            )}
            <div className={styles.formRow}>
              <input className={styles.textInput} placeholder="Crop (e.g. Paddy)" value={recoCrop} onChange={(e) => setRecoCrop(e.target.value)} />
              <Button size="sm" isLoading={busy} onClick={() => void handleGetRecommendations()}>Get Recommendations</Button>
            </div>
            {varieties.length === 0 && recoCrop ? <p className={styles.rowMeta}>No approved, issued varieties found for "{recoCrop}" yet.</p> : null}

            {recommendations === null ? (
              <div className={styles.emptyState}>Select a farmer, farm, and crop to see climate-smart recommendations.</div>
            ) : recommendations.length === 0 ? (
              <div className={styles.emptyState}>No approved varieties available for this crop.</div>
            ) : (
              <table className={styles.table}>
                <thead><tr><th>Variety</th><th>Base Score</th><th>Climate Score</th><th>Combined</th></tr></thead>
                <tbody>
                  {recommendations.map((r) => (
                    <tr key={r.varietyId}>
                      <td>{r.varietyName}</td>
                      <td>{r.baseScore}</td>
                      <td>{r.climateResilienceScore ?? 'no data'}</td>
                      <td className={styles.scoreValue}>{r.combinedScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Suggested Crop Rotation</h2>
            <p className={styles.sectionSubtitle}>Based on this farm's most recently tracked crop.</p>
            {rotationSuggestions === null ? (
              <div className={styles.emptyState}>Get recommendations for a farm to see rotation suggestions.</div>
            ) : rotationSuggestions.length === 0 ? (
              <div className={styles.emptyState}>No planting history yet, or the last crop isn't in the known crop set — nothing to suggest.</div>
            ) : (
              rotationSuggestions.map((s, i) => (
                <div key={i} className={styles.row}>
                  <div>
                    <strong><Leaf size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{s.crop}</strong>
                    <div className={styles.rowMeta}>{s.reason}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'climate-data' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h2 className={styles.sectionTitle}>Climate Predictions</h2>
            </div>
            {canRecord && (
              <>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Region" value={newPrediction.region} onChange={(e) => setNewPrediction((p) => ({ ...p, region: e.target.value }))} />
                  <input className={styles.textInput} placeholder="Season (e.g. Kharif)" value={newPrediction.season} onChange={(e) => setNewPrediction((p) => ({ ...p, season: e.target.value }))} />
                </div>
                <div className={styles.formRow}>
                  <input className={styles.numberInput} type="number" placeholder="Rainfall mm" value={newPrediction.predictedRainfallMm} onChange={(e) => setNewPrediction((p) => ({ ...p, predictedRainfallMm: e.target.value }))} />
                  <input className={styles.numberInput} type="number" placeholder="Avg temp °C" value={newPrediction.predictedAvgTempCelsius} onChange={(e) => setNewPrediction((p) => ({ ...p, predictedAvgTempCelsius: e.target.value }))} />
                  <select className={styles.select} value={newPrediction.riskLevel} onChange={(e) => setNewPrediction((p) => ({ ...p, riskLevel: e.target.value as RiskLevel }))}>
                    {RISK_LEVELS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <select className={styles.select} value={newPrediction.primaryRiskFactor} onChange={(e) => setNewPrediction((p) => ({ ...p, primaryRiskFactor: e.target.value as PrimaryRiskFactor }))}>
                    <option value="">No specific risk factor</option>
                    {PRIMARY_RISK_FACTORS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Source (e.g. State Met Dept)" value={newPrediction.source} onChange={(e) => setNewPrediction((p) => ({ ...p, source: e.target.value }))} />
                  <Button size="sm" isLoading={busy} onClick={() => void handleRecordPrediction()}>Record</Button>
                </div>
              </>
            )}
            {predictions.length === 0 ? (
              <div className={styles.emptyState}>No climate predictions recorded yet.</div>
            ) : (
              predictions.slice(0, 10).map((p) => (
                <div key={p.id} className={styles.row}>
                  <div>
                    <strong>{p.region}</strong>
                    <span className={`${styles.riskBadge} ${riskBadgeClass(p.risk_level)}`} style={{ marginLeft: '0.5rem' }}>{p.risk_level}</span>
                    <div className={styles.rowMeta}>
                      {p.season} · {p.predicted_rainfall_mm != null ? `${p.predicted_rainfall_mm}mm rain` : ''}{p.predicted_avg_temp_celsius != null ? ` · ${p.predicted_avg_temp_celsius}°C avg` : ''}{p.primary_risk_factor ? ` · ${p.primary_risk_factor}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Climate Risk Alerts</h2>
            <p className={styles.sectionSubtitle}>Auto-generated for farms with an active crop plan when a high/severe-risk prediction is recorded, delivered in real time over the app's WebSocket channel.</p>
            {alerts.length === 0 ? (
              <div className={styles.emptyState}>No alerts yet.</div>
            ) : (
              alerts.slice(0, 15).map((a) => (
                <div key={a.id} className={styles.row}>
                  <div>
                    <span className={`${styles.riskBadge} ${riskBadgeClass(a.risk_level)}`}>{a.risk_level}</span>
                    <span style={{ marginLeft: '0.5rem' }}>{a.crop}</span>
                    <div className={styles.rowMeta}>{a.message}</div>
                  </div>
                  {!a.acknowledged && (
                    <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleAcknowledge(a.id)}>Acknowledge</Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'outcomes' && (
        <div className={styles.grid}>
          {canRecord && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Record an Adaptation Outcome</h2>
              <p className={styles.sectionSubtitle}>Closes the loop — feeds future climate resilience scores for this variety.</p>
              <div className={styles.formRow}>
                <select className={styles.select} value={newOutcome.farmId} onChange={(e) => setNewOutcome((o) => ({ ...o, farmId: e.target.value }))}>
                  <option value="">Select a farm</option>
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <select className={styles.select} value={newOutcome.varietyId} onChange={(e) => setNewOutcome((o) => ({ ...o, varietyId: e.target.value }))}>
                  <option value="">Select a variety</option>
                  {varieties.map((v) => (
                    <option key={v.id} value={v.id}>{v.variety_name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <input className={styles.textInput} placeholder="Crop" value={newOutcome.crop} onChange={(e) => setNewOutcome((o) => ({ ...o, crop: e.target.value }))} />
                <input className={styles.textInput} placeholder="Season" value={newOutcome.season} onChange={(e) => setNewOutcome((o) => ({ ...o, season: e.target.value }))} />
                <input className={styles.numberInput} type="number" placeholder="Yield/acre" value={newOutcome.actualYieldPerAcre} onChange={(e) => setNewOutcome((o) => ({ ...o, actualYieldPerAcre: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <select className={styles.select} value={newOutcome.outcomeRating} onChange={(e) => setNewOutcome((o) => ({ ...o, outcomeRating: e.target.value as OutcomeRating }))}>
                  {OUTCOME_RATINGS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <Button size="sm" isLoading={busy} onClick={() => void handleRecordOutcome()}>Record Outcome</Button>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Recorded Adaptation Outcomes</h2>
            {outcomes.length === 0 ? (
              <div className={styles.emptyState}>No outcomes recorded yet.</div>
            ) : (
              outcomes.map((o) => (
                <div key={o.id} className={styles.row}>
                  <div>
                    <strong>{o.crop}</strong> — {o.outcome_rating}
                    <div className={styles.rowMeta}>{o.season} · {o.actual_yield_per_acre != null ? `${o.actual_yield_per_acre}/acre` : 'no yield recorded'} · {o.notes ?? ''}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
