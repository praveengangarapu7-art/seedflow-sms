import { useCallback, useEffect, useState } from 'react';
import { Dna, GitBranch, RefreshCw, Sprout, TrendingUp } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  fetchBreedingCycleTimelines,
  fetchBreedingProgramRoi,
  fetchGermplasmPoolRankings,
  fetchHybridCrossPredictions,
  fetchLineageSummary,
  fetchSeedLots,
  fetchTraitInheritance,
  fetchTraitMeasurementsForLot,
  login,
  predictHybridCrossVigor,
  recordActualCrossOutcome,
  recordTraitMeasurement,
  type BreedingCycleTimelineEntry,
  type BreedingProgramRoiEntry,
  type GermplasmPoolRanking,
  type HybridCrossPrediction,
  type LineageSummaryEntry,
  type LotTraitMeasurement,
  type RealtimeSeedLot,
  type TraitInheritanceReport,
} from '@/services/seedLotRealtimeClient';
import styles from './BreedingAnalytics.module.css';

const BREEDING_DATA_ROLES = new Set(['Admin', 'Breeder']);
type Tab = 'lineage' | 'traits' | 'hybrid' | 'reports';

function strengthBadgeClass(strength: string): string {
  const key = `strength${strength.charAt(0).toUpperCase()}${strength.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function BreedingAnalytics() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);
  const [tab, setTab] = useState<Tab>('lineage');

  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [lineages, setLineages] = useState<LineageSummaryEntry[]>([]);
  const [rankings, setRankings] = useState<GermplasmPoolRanking[]>([]);

  const [selectedLotId, setSelectedLotId] = useState('');
  const [lotTraits, setLotTraits] = useState<LotTraitMeasurement[]>([]);
  const [newTrait, setNewTrait] = useState({ traitType: '', valueMode: 'numeric' as 'numeric' | 'category', numericValue: '', categoryValue: '', unit: '', measuredDate: '' });

  const [inheritanceTraitType, setInheritanceTraitType] = useState('');
  const [inheritanceReport, setInheritanceReport] = useState<TraitInheritanceReport | null>(null);

  const [predictions, setPredictions] = useState<HybridCrossPrediction[]>([]);
  const [newCross, setNewCross] = useState({ parentALotId: '', parentBLotId: '', traitType: '' });
  const [outcomeInputs, setOutcomeInputs] = useState<Record<string, { childLotId: string; actualValue: string }>>({});

  const [timelines, setTimelines] = useState<BreedingCycleTimelineEntry[]>([]);
  const [roiEntries, setRoiEntries] = useState<BreedingProgramRoiEntry[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async (accessToken: string) => {
    setError(null);
    try {
      const [lotList, lineageList, rankingList, predictionList, timelineList, roiList] = await Promise.all([
        fetchSeedLots(accessToken),
        fetchLineageSummary(accessToken),
        fetchGermplasmPoolRankings(accessToken),
        fetchHybridCrossPredictions(accessToken),
        fetchBreedingCycleTimelines(accessToken),
        fetchBreedingProgramRoi(accessToken),
      ]);
      setLots(lotList);
      setLineages(lineageList);
      setRankings(rankingList);
      setPredictions(predictionList);
      setTimelines(timelineList);
      setRoiEntries(roiList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load breeding analytics data');
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the breeding analytics service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (!token || !selectedLotId) {
      setLotTraits([]);
      return;
    }
    fetchTraitMeasurementsForLot(token, selectedLotId).then(setLotTraits).catch(() => setLotTraits([]));
  }, [token, selectedLotId]);

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

  const handleRecordTrait = () =>
    withBusy(async () => {
      if (!token || !selectedLotId || !newTrait.traitType.trim() || !newTrait.measuredDate) {
        setError('Select a seed lot, trait type, and measured date.');
        return;
      }
      await recordTraitMeasurement(token, {
        seedLotId: selectedLotId,
        traitType: newTrait.traitType.trim(),
        numericValue: newTrait.valueMode === 'numeric' ? Number(newTrait.numericValue) : undefined,
        categoryValue: newTrait.valueMode === 'category' ? newTrait.categoryValue.trim() : undefined,
        unit: newTrait.unit.trim() || undefined,
        measuredDate: newTrait.measuredDate,
      });
      setMessage('Trait measurement recorded.');
      setNewTrait({ traitType: '', valueMode: 'numeric', numericValue: '', categoryValue: '', unit: '', measuredDate: '' });
      setLotTraits(await fetchTraitMeasurementsForLot(token, selectedLotId));
    });

  const handleAnalyzeInheritance = () =>
    withBusy(async () => {
      if (!token || !inheritanceTraitType.trim()) {
        setError('Enter a trait type to analyze.');
        return;
      }
      const report = await fetchTraitInheritance(token, inheritanceTraitType.trim());
      setInheritanceReport(report);
    });

  const handlePredictCross = () =>
    withBusy(async () => {
      if (!token || !newCross.parentALotId || !newCross.parentBLotId || !newCross.traitType.trim()) {
        setError('Select both parent lots and a trait type.');
        return;
      }
      const prediction = await predictHybridCrossVigor(token, {
        parentALotId: newCross.parentALotId,
        parentBLotId: newCross.parentBLotId,
        traitType: newCross.traitType.trim(),
      });
      setMessage(`Predicted vigor score ${prediction.predicted_vigor_score} (${prediction.predicted_heterosis_percent}% heterosis over mid-parent).`);
      setNewCross({ parentALotId: '', parentBLotId: '', traitType: '' });
      setPredictions(await fetchHybridCrossPredictions(token));
    });

  const handleRecordOutcome = (predictionId: string) =>
    withBusy(async () => {
      if (!token) return;
      const input = outcomeInputs[predictionId];
      if (!input?.childLotId || !input?.actualValue) {
        setError('Select the resulting child lot and enter its actual trait value.');
        return;
      }
      await recordActualCrossOutcome(token, predictionId, { actualChildLotId: input.childLotId, actualTraitValue: Number(input.actualValue) });
      setMessage('Actual cross outcome recorded.');
      setPredictions(await fetchHybridCrossPredictions(token));
    });

  const canRecord = BREEDING_DATA_ROLES.has(role);
  const topGermplasm = rankings[0] ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Breeding Program Analytics &amp; Genetics Tracking</h1>
          <p className={styles.subtitle}>
            Track genetic lineage across breeder lots, measure per-lot trait values, analyze real inheritance
            correlations, rank germplasm pools, predict hybrid vigor with a fully explainable heuristic, and measure
            breeding cycle timelines and yield-based program ROI.
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
        <KpiCard title="Breeding Lineages Tracked" value={String(lineages.length)} icon={GitBranch} />
        <KpiCard title="Top Germplasm Pool" value={topGermplasm ? `${topGermplasm.rootLotCode} (${topGermplasm.score})` : '—'} icon={Sprout} />
        <KpiCard title="Hybrid Predictions Made" value={String(predictions.length)} icon={Dna} />
        <KpiCard title="Program ROI Entries" value={String(roiEntries.length)} icon={TrendingUp} />
      </div>

      <div className={styles.tabBar}>
        {(['lineage', 'traits', 'hybrid', 'reports'] as Tab[]).map((t) => (
          <button key={t} className={`${styles.tabButton} ${tab === t ? styles.tabButtonActive : ''}`} onClick={() => setTab(t)}>
            {t === 'lineage' ? 'Lineage & Germplasm' : t === 'traits' ? 'Trait Data' : t === 'hybrid' ? 'Hybrid Predictions' : 'Cycle & ROI'}
          </button>
        ))}
      </div>

      {tab === 'lineage' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Lineage Summary</h2>
            <p className={styles.sectionSubtitle}>Every root Breeder lot and how far its lineage has multiplied.</p>
            {lineages.length === 0 ? (
              <div className={styles.emptyState}>No breeder lineages found.</div>
            ) : (
              <table className={styles.table}>
                <thead><tr><th>Root Lot</th><th>Crop/Variety</th><th>Foundation</th><th>Certified</th><th>Total Qty</th></tr></thead>
                <tbody>
                  {lineages.map((l) => (
                    <tr key={l.rootLotId}>
                      <td>{l.rootLotCode}</td>
                      <td>{l.crop} / {l.variety}</td>
                      <td>{l.foundationLotCount}</td>
                      <td>{l.certifiedLotCount}</td>
                      <td>{l.totalDescendantQuantity.toLocaleString()} {l.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Superior Germplasm Pools</h2>
            <p className={styles.sectionSubtitle}>Ranked by a weighted score over germination quality, multiplication efficiency, and breeding breadth.</p>
            {rankings.length === 0 ? (
              <div className={styles.emptyState}>No germplasm data yet.</div>
            ) : (
              rankings.map((r) => (
                <div key={r.rootLotId} className={styles.row}>
                  <div>
                    <strong>{r.rootLotCode}</strong>
                    <div className={styles.rowMeta}>
                      {r.crop} / {r.variety} — {r.breakdown.map((b) => `${b.signal}: ${b.normalizedValue.toFixed(0)}`).join(', ') || 'no signals yet'}
                    </div>
                  </div>
                  <span className={styles.scoreValue}>{r.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'traits' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Record a Trait Measurement</h2>
            <div className={styles.formRow}>
              <select className={styles.select} value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                <option value="">Select a seed lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.crop} ({lot.stage})</option>
                ))}
              </select>
              <input className={styles.textInput} placeholder="Trait type (e.g. yield_per_acre)" value={newTrait.traitType} onChange={(e) => setNewTrait((t) => ({ ...t, traitType: e.target.value }))} />
            </div>
            {canRecord && (
              <>
                <div className={styles.radioGroup} style={{ marginBottom: '0.75rem' }}>
                  <label><input type="radio" checked={newTrait.valueMode === 'numeric'} onChange={() => setNewTrait((t) => ({ ...t, valueMode: 'numeric' }))} /> Numeric</label>
                  <label><input type="radio" checked={newTrait.valueMode === 'category'} onChange={() => setNewTrait((t) => ({ ...t, valueMode: 'category' }))} /> Category</label>
                </div>
                <div className={styles.formRow}>
                  {newTrait.valueMode === 'numeric' ? (
                    <>
                      <input className={styles.numberInput} type="number" placeholder="Value" value={newTrait.numericValue} onChange={(e) => setNewTrait((t) => ({ ...t, numericValue: e.target.value }))} />
                      <input className={styles.textInput} placeholder="Unit (e.g. kg/acre)" value={newTrait.unit} onChange={(e) => setNewTrait((t) => ({ ...t, unit: e.target.value }))} />
                    </>
                  ) : (
                    <input className={styles.textInput} placeholder="Category (e.g. high)" value={newTrait.categoryValue} onChange={(e) => setNewTrait((t) => ({ ...t, categoryValue: e.target.value }))} />
                  )}
                  <input className={styles.textInput} type="date" value={newTrait.measuredDate} onChange={(e) => setNewTrait((t) => ({ ...t, measuredDate: e.target.value }))} />
                  <Button size="sm" isLoading={busy} onClick={() => void handleRecordTrait()}>Record</Button>
                </div>
              </>
            )}
            {lotTraits.length === 0 ? (
              <div className={styles.emptyState}>{selectedLotId ? 'No traits recorded for this lot.' : 'Select a lot to view its trait history.'}</div>
            ) : (
              lotTraits.map((t) => (
                <div key={t.id} className={styles.row}>
                  <div>
                    <strong>{t.trait_type}</strong>
                    <div className={styles.rowMeta}>{t.numeric_value != null ? `${t.numeric_value} ${t.unit ?? ''}` : t.category_value} on {new Date(t.measured_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Trait Inheritance Analysis</h2>
            <p className={styles.sectionSubtitle}>Pearson correlation between a trait's value on each parent lot and its child lot, across every measured pair.</p>
            <div className={styles.formRow}>
              <input className={styles.textInput} placeholder="Trait type" value={inheritanceTraitType} onChange={(e) => setInheritanceTraitType(e.target.value)} />
              <Button size="sm" isLoading={busy} onClick={() => void handleAnalyzeInheritance()}>Analyze</Button>
            </div>
            {!inheritanceReport ? (
              <div className={styles.emptyState}>Enter a trait type to analyze inheritance patterns.</div>
            ) : (
              <>
                <div className={styles.row}>
                  <div>
                    <strong>Correlation: {inheritanceReport.correlation ?? '—'}</strong>
                    <div className={styles.rowMeta}>{inheritanceReport.sampleSize} parent/child pair(s) measured</div>
                  </div>
                  <span className={`${styles.strengthBadge} ${strengthBadgeClass(inheritanceReport.strength)}`}>{inheritanceReport.strength.replace('_', ' ')}</span>
                </div>
                {inheritanceReport.pairs.length > 0 && (
                  <table className={styles.table}>
                    <thead><tr><th>Parent Lot</th><th>Parent Value</th><th>Child Lot</th><th>Child Value</th></tr></thead>
                    <tbody>
                      {inheritanceReport.pairs.map((p, i) => (
                        <tr key={i}><td>{p.parentLotCode}</td><td>{p.parentValue}</td><td>{p.childLotCode}</td><td>{p.childValue}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'hybrid' && (
        <div className={styles.grid}>
          {canRecord && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Predict Hybrid Vigor for a New Cross</h2>
              <p className={styles.sectionSubtitle}>Both parent lots need a recorded numeric measurement for the chosen trait.</p>
              <div className={styles.formRow}>
                <select className={styles.select} value={newCross.parentALotId} onChange={(e) => setNewCross((c) => ({ ...c, parentALotId: e.target.value }))}>
                  <option value="">Parent A</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code}</option>
                  ))}
                </select>
                <select className={styles.select} value={newCross.parentBLotId} onChange={(e) => setNewCross((c) => ({ ...c, parentBLotId: e.target.value }))}>
                  <option value="">Parent B</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code}</option>
                  ))}
                </select>
                <input className={styles.textInput} placeholder="Trait type" value={newCross.traitType} onChange={(e) => setNewCross((c) => ({ ...c, traitType: e.target.value }))} />
                <Button size="sm" isLoading={busy} onClick={() => void handlePredictCross()}>Predict</Button>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Cross Predictions</h2>
            {predictions.length === 0 ? (
              <div className={styles.emptyState}>No hybrid cross predictions yet.</div>
            ) : (
              predictions.map((p) => (
                <div key={p.id} className={styles.row}>
                  <div>
                    <strong>{p.trait_type}</strong> — vigor {p.predicted_vigor_score} ({p.predicted_heterosis_percent}% heterosis)
                    <div className={styles.rowMeta}>
                      mid-parent {p.mid_parent_value} · {p.same_lineage ? 'same lineage' : 'different lineage'} ·{' '}
                      {p.actual_child_lot_id ? `actual: ${p.actual_trait_value}` : 'no actual outcome recorded yet'}
                    </div>
                    {!p.actual_child_lot_id && canRecord && (
                      <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                        <select
                          className={styles.select}
                          value={outcomeInputs[p.id]?.childLotId ?? ''}
                          onChange={(e) => setOutcomeInputs((prev) => ({ ...prev, [p.id]: { childLotId: e.target.value, actualValue: prev[p.id]?.actualValue ?? '' } }))}
                        >
                          <option value="">Resulting child lot</option>
                          {lots.map((lot) => (
                            <option key={lot.id} value={lot.id}>{lot.lot_code}</option>
                          ))}
                        </select>
                        <input
                          className={styles.numberInput}
                          type="number"
                          placeholder="Actual value"
                          value={outcomeInputs[p.id]?.actualValue ?? ''}
                          onChange={(e) => setOutcomeInputs((prev) => ({ ...prev, [p.id]: { childLotId: prev[p.id]?.childLotId ?? '', actualValue: e.target.value } }))}
                        />
                        <Button size="sm" isLoading={busy} onClick={() => void handleRecordOutcome(p.id)}>Record Outcome</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Breeding Cycle Timelines</h2>
            <p className={styles.sectionSubtitle}>Days from each root Breeder lot to its Foundation/Certified descendants.</p>
            {timelines.length === 0 ? (
              <div className={styles.emptyState}>No cycle data yet.</div>
            ) : (
              <table className={styles.table}>
                <thead><tr><th>Root</th><th>Descendant</th><th>Stage</th><th>Days</th></tr></thead>
                <tbody>
                  {timelines.map((t, i) => (
                    <tr key={i}><td>{t.rootLotCode}</td><td>{t.descendantLotCode}</td><td>{t.descendantStage}</td><td>{t.daysFromRoot}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Breeding Program ROI</h2>
            <p className={styles.sectionSubtitle}>Foundation-stage yield achieved per unit of Breeder-stage seed — a multiplication ratio, not a monetary figure (this app has no cost basis for breeding programs).</p>
            {roiEntries.length === 0 ? (
              <div className={styles.emptyState}>No ROI data yet.</div>
            ) : (
              <table className={styles.table}>
                <thead><tr><th>Root Lot</th><th>Crop/Variety</th><th>Breeder Qty</th><th>Foundation Yield</th><th>ROI</th></tr></thead>
                <tbody>
                  {roiEntries.map((r) => (
                    <tr key={r.rootLotId}>
                      <td>{r.rootLotCode}</td>
                      <td>{r.crop} / {r.variety}</td>
                      <td>{r.breederStageQuantity.toLocaleString()} {r.unit}</td>
                      <td>{r.foundationYieldAchieved.toLocaleString()} {r.unit}</td>
                      <td>{r.yieldMultiplicationRoi != null ? `${r.yieldMultiplicationRoi}x` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
