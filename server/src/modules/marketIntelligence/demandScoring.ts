// Pure logic — zero DB imports, same reasoning as hashChain.ts,
// partnerScoring.ts, and subsidyEligibility.ts elsewhere in this app. This
// app has no real ML infrastructure or training data, so "predict which
// varieties will be in demand" is deliberately NOT a black-box model —
// it's a transparent, weighted combination of real signals already in this
// app's data (adoption history) plus staff-recorded external observations
// (price, ministry forecasts, weather, insurance claims). Every signal's
// weight and contribution is returned in `breakdown`, so a forecast is
// always explainable: "why did this variety score 72?" has a real answer.

export type WeatherOutlook = 'favorable' | 'normal' | 'adverse' | 'severe';
export type RecommendedAction = 'increase_production' | 'maintain' | 'decrease_production';

export interface DemandSignalInputs {
  /** From performanceRatings.getVarietyEffectiveness() — 0-100, or null if this variety has no seed-request history yet. */
  adoptionRatePercent?: number | null;
  /** From the same source — 0-100, or null. */
  repeatRequestRatePercent?: number | null;
  /** % change between the oldest and newest recorded market price for this crop/variety, or null if fewer than 2 observations exist. */
  priceTrendPercent?: number | null;
  /** % change between the two most recent ministry demand forecasts for this crop/variety, or null if fewer than 2 exist. */
  ministryGrowthPercent?: number | null;
  /** Most recent recorded weather outlook for this crop/season, or null if none recorded. */
  weatherOutlook?: WeatherOutlook | null;
  /** Total insurance claims recorded against this crop/variety/season, or null if none recorded. */
  insuranceClaimsCount?: number | null;
}

export interface SignalContribution {
  signal: string;
  weight: number;
  deviation: number;
}

export interface DemandScoreResult {
  score: number;
  recommendedAction: RecommendedAction;
  breakdown: SignalContribution[];
}

// Relative weights among whatever signals are actually available — a
// variety missing ministry data isn't penalized to some assumed neutral
// value, it's simply excluded from the average rather than guessed at.
const SIGNAL_WEIGHTS = {
  adoptionRate: 30,
  repeatRequestRate: 15,
  priceTrend: 15,
  ministryGrowth: 20,
  weatherOutlook: 10,
  insuranceRisk: 10,
};

const WEATHER_DEVIATION: Record<WeatherOutlook, number> = {
  favorable: 30,
  normal: 0,
  adverse: -30,
  severe: -50,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeDemandScore(input: DemandSignalInputs): DemandScoreResult {
  const breakdown: SignalContribution[] = [];

  // Each deviation is centered on 0 ("no signal either way") and roughly
  // bounded to ±50, so no single signal can single-handedly swing the
  // final 0-100 score past its own weighted share.
  if (input.adoptionRatePercent != null) {
    breakdown.push({ signal: 'adoptionRate', weight: SIGNAL_WEIGHTS.adoptionRate, deviation: input.adoptionRatePercent - 50 });
  }
  if (input.repeatRequestRatePercent != null) {
    breakdown.push({ signal: 'repeatRequestRate', weight: SIGNAL_WEIGHTS.repeatRequestRate, deviation: input.repeatRequestRatePercent - 50 });
  }
  if (input.priceTrendPercent != null) {
    breakdown.push({ signal: 'priceTrend', weight: SIGNAL_WEIGHTS.priceTrend, deviation: clamp(input.priceTrendPercent, -50, 50) });
  }
  if (input.ministryGrowthPercent != null) {
    breakdown.push({ signal: 'ministryGrowth', weight: SIGNAL_WEIGHTS.ministryGrowth, deviation: clamp(input.ministryGrowthPercent, -50, 50) });
  }
  if (input.weatherOutlook != null) {
    breakdown.push({ signal: 'weatherOutlook', weight: SIGNAL_WEIGHTS.weatherOutlook, deviation: WEATHER_DEVIATION[input.weatherOutlook] });
  }
  if (input.insuranceClaimsCount != null) {
    breakdown.push({ signal: 'insuranceRisk', weight: SIGNAL_WEIGHTS.insuranceRisk, deviation: -clamp(input.insuranceClaimsCount * 5, 0, 50) });
  }

  if (breakdown.length === 0) {
    // No signal at all recorded for this variety — the honest answer is
    // "we don't know," a neutral midpoint, not a fabricated confident number.
    return { score: 50, recommendedAction: 'maintain', breakdown: [] };
  }

  const totalWeight = breakdown.reduce((sum, c) => sum + c.weight, 0);
  const weightedDeviation = breakdown.reduce((sum, c) => sum + c.deviation * c.weight, 0) / totalWeight;
  const score = Math.round(clamp(50 + weightedDeviation, 0, 100) * 10) / 10;

  const recommendedAction: RecommendedAction = score >= 65 ? 'increase_production' : score <= 35 ? 'decrease_production' : 'maintain';

  return { score, recommendedAction, breakdown };
}

/**
 * A dynamic pricing SUGGESTION, not an automated charge — this app has no
 * payment/billing system anywhere, so this is decision-support for staff
 * negotiating an allocation, derived from a real recorded base price
 * adjusted by how strong the demand signal is. Returns null (not a
 * fabricated number) when no base price has ever been recorded.
 */
export function computeSuggestedPrice(basePricePerUnit: number | null | undefined, demandScore: number): number | null {
  if (basePricePerUnit == null) return null;
  const multiplier = 0.85 + (clamp(demandScore, 0, 100) / 100) * 0.3; // 0 -> 0.85x, 50 -> 1.0x, 100 -> 1.15x
  return Math.round(basePricePerUnit * multiplier * 100) / 100;
}
