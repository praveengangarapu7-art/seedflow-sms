// Pure logic — zero DB imports, same reasoning as demandScoring.ts and its
// siblings elsewhere in this app. "Analyze trait inheritance patterns"
// means something real and checkable here: a Pearson correlation between a
// trait's measured value on each parent lot and the same trait's measured
// value on that parent's child lot, across every parent/child pair with
// both measurements recorded — not a fabricated genetics claim.

export interface TraitPair {
  parentValue: number;
  childValue: number;
}

export type CorrelationStrength = 'insufficient_data' | 'weak' | 'moderate' | 'strong';

export interface TraitCorrelationResult {
  correlation: number | null;
  sampleSize: number;
  strength: CorrelationStrength;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Standard Pearson product-moment correlation coefficient. Requires at
 * least 3 pairs — a correlation computed from 1-2 points is not a
 * meaningful statistic, so it's reported as insufficient data rather than
 * a misleadingly precise number.
 */
export function computeTraitCorrelation(pairs: TraitPair[]): TraitCorrelationResult {
  const sampleSize = pairs.length;
  if (sampleSize < 3) {
    return { correlation: null, sampleSize, strength: 'insufficient_data' };
  }

  const parentValues = pairs.map((p) => p.parentValue);
  const childValues = pairs.map((p) => p.childValue);
  const meanParent = mean(parentValues);
  const meanChild = mean(childValues);

  let numerator = 0;
  let parentSumSquares = 0;
  let childSumSquares = 0;
  for (let i = 0; i < sampleSize; i++) {
    const parentDeviation = parentValues[i] - meanParent;
    const childDeviation = childValues[i] - meanChild;
    numerator += parentDeviation * childDeviation;
    parentSumSquares += parentDeviation * parentDeviation;
    childSumSquares += childDeviation * childDeviation;
  }

  const denominator = Math.sqrt(parentSumSquares) * Math.sqrt(childSumSquares);
  // No variance in one of the series (e.g. every parent measured
  // identically) makes correlation mathematically undefined — reported as
  // zero/weak rather than dividing by zero.
  if (denominator === 0) {
    return { correlation: 0, sampleSize, strength: 'weak' };
  }

  const correlation = Math.round((numerator / denominator) * 1000) / 1000;
  return { correlation, sampleSize, strength: classifyCorrelationStrength(correlation) };
}

/** Split out from computeTraitCorrelation so the strength boundaries (0.4, 0.7) are exactly testable without having to hand-construct a dataset that produces a precise Pearson r. */
export function classifyCorrelationStrength(correlation: number): CorrelationStrength {
  const magnitude = Math.abs(correlation);
  if (magnitude >= 0.7) return 'strong';
  if (magnitude >= 0.4) return 'moderate';
  return 'weak';
}
