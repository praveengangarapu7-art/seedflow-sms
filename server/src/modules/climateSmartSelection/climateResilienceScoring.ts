// Pure logic — zero DB imports, same reasoning as every other scoring
// engine this session (demandScoring.ts, germplasmScoring.ts, etc.).
// Climate resilience is scored only from signals that actually have data:
// a recorded stress-tolerance trait measurement, and/or a real track
// record of how this variety performed under similarly risky conditions in
// the past. If neither exists, the score is null — not a fabricated
// number — so a caller blending this into a recommendation knows to treat
// an unscored variety as neutral rather than penalized.

export interface ClimateResilienceInputs {
  /** 0-100, derived from a recorded drought/heat/flood-tolerance trait measurement matching the current predicted risk factor, or null if none recorded. */
  toleranceScore?: number | null;
  /** 0-100, derived from past recorded adaptation_outcomes for this variety under a comparable risk level, or null if none recorded. */
  adaptationTrackRecordScore?: number | null;
}

export interface ClimateResilienceSignalContribution {
  signal: string;
  weight: number;
  value: number;
}

export interface ClimateResilienceResult {
  score: number | null;
  breakdown: ClimateResilienceSignalContribution[];
}

const WEIGHTS = { tolerance: 60, adaptationTrackRecord: 40 };

export function computeClimateResilienceScore(input: ClimateResilienceInputs): ClimateResilienceResult {
  const breakdown: ClimateResilienceSignalContribution[] = [];

  if (input.toleranceScore != null) {
    breakdown.push({ signal: 'stressTolerance', weight: WEIGHTS.tolerance, value: input.toleranceScore });
  }
  if (input.adaptationTrackRecordScore != null) {
    breakdown.push({ signal: 'adaptationTrackRecord', weight: WEIGHTS.adaptationTrackRecord, value: input.adaptationTrackRecordScore });
  }

  if (breakdown.length === 0) {
    return { score: null, breakdown: [] };
  }

  const totalWeight = breakdown.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = breakdown.reduce((sum, c) => sum + c.value * c.weight, 0);
  const score = Math.round((weightedSum / totalWeight) * 10) / 10;

  return { score, breakdown };
}
