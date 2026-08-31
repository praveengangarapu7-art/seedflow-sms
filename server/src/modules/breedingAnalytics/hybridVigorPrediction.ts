// Pure logic — zero DB imports, same reasoning as the other scoring engines
// in this app. There's no genomic/SNP data anywhere in this system, so
// predicting hybrid vigor for a cross that hasn't been made yet uses the
// simplified model plant breeding itself actually teaches for exactly this
// situation before real trial data exists: heterosis (F1 performance above
// the average of its two parents) tends to scale with how genetically
// divergent the parents are, and any REAL past outcomes from similarly
// divergent crosses are the single most trustworthy signal available,
// weighted above the generic heuristic rather than instead of it.

export interface HybridVigorInputs {
  parentATraitValue: number;
  parentBTraitValue: number;
  /** Whether both parents trace back to the same root Breeder lineage (mv_seed_lot_genealogy ancestor root) — same lineage crosses are more inbred and predicted to show less heterosis. */
  sameLineage: boolean;
  /** Average realized heterosis % from past crosses with a recorded actual outcome that shared this same sameLineage relationship, or null if no such history exists yet. */
  historicalAvgHeterosisPercent?: number | null;
}

export interface HybridVigorSignalContribution {
  signal: string;
  contributionPercent: number;
}

export interface HybridVigorResult {
  midParentValue: number;
  heterosisPercent: number;
  predictedVigorScore: number;
  breakdown: HybridVigorSignalContribution[];
}

const SAME_LINEAGE_HETEROSIS_PERCENT = 2;
const DIFFERENT_LINEAGE_HETEROSIS_PERCENT = 10;
// Real realized outcomes are trusted twice as much as the generic
// divergence heuristic once at least one exists to blend in.
const HISTORICAL_WEIGHT = 2;
const HEURISTIC_WEIGHT = 1;

export function predictHybridVigor(input: HybridVigorInputs): HybridVigorResult {
  const midParentValue = Math.round(((input.parentATraitValue + input.parentBTraitValue) / 2) * 100) / 100;

  const divergenceHeterosisPercent = input.sameLineage ? SAME_LINEAGE_HETEROSIS_PERCENT : DIFFERENT_LINEAGE_HETEROSIS_PERCENT;
  const breakdown: HybridVigorSignalContribution[] = [
    { signal: 'geneticDivergence', contributionPercent: divergenceHeterosisPercent },
  ];

  let heterosisPercent = divergenceHeterosisPercent;
  if (input.historicalAvgHeterosisPercent != null) {
    heterosisPercent =
      (divergenceHeterosisPercent * HEURISTIC_WEIGHT + input.historicalAvgHeterosisPercent * HISTORICAL_WEIGHT) /
      (HEURISTIC_WEIGHT + HISTORICAL_WEIGHT);
    breakdown.push({ signal: 'historicalRealizedHeterosis', contributionPercent: input.historicalAvgHeterosisPercent });
  }
  heterosisPercent = Math.round(heterosisPercent * 100) / 100;

  const predictedVigorScore = Math.round(midParentValue * (1 + heterosisPercent / 100) * 100) / 100;

  return { midParentValue, heterosisPercent, predictedVigorScore, breakdown };
}
