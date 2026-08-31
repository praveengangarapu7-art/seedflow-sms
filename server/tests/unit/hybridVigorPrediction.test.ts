import { describe, expect, it } from 'vitest';
import { predictHybridVigor } from '../../src/modules/breedingAnalytics/hybridVigorPrediction';

describe('hybridVigorPrediction.predictHybridVigor', () => {
  it('computes the mid-parent value as the plain average of both parents', () => {
    const result = predictHybridVigor({ parentATraitValue: 40, parentBTraitValue: 60, sameLineage: false });
    expect(result.midParentValue).toBe(50);
  });

  it('applies a larger heterosis bonus for parents from different lineages than the same lineage', () => {
    const differentLineage = predictHybridVigor({ parentATraitValue: 50, parentBTraitValue: 50, sameLineage: false });
    const sameLineage = predictHybridVigor({ parentATraitValue: 50, parentBTraitValue: 50, sameLineage: true });
    expect(differentLineage.heterosisPercent).toBeGreaterThan(sameLineage.heterosisPercent);
    expect(differentLineage.predictedVigorScore).toBeGreaterThan(sameLineage.predictedVigorScore);
  });

  it('predicts a 10% vigor premium over mid-parent for a different-lineage cross with no historical data', () => {
    const result = predictHybridVigor({ parentATraitValue: 100, parentBTraitValue: 100, sameLineage: false });
    expect(result.heterosisPercent).toBe(10);
    expect(result.predictedVigorScore).toBe(110); // 100 mid-parent * 1.10
    expect(result.breakdown).toEqual([{ signal: 'geneticDivergence', contributionPercent: 10 }]);
  });

  it('predicts only a 2% vigor premium for a same-lineage cross with no historical data', () => {
    const result = predictHybridVigor({ parentATraitValue: 100, parentBTraitValue: 100, sameLineage: true });
    expect(result.heterosisPercent).toBe(2);
    expect(result.predictedVigorScore).toBe(102);
  });

  it('blends in historical realized heterosis, weighted twice as heavily as the generic heuristic', () => {
    // different lineage heuristic=10, historical=40 -> (10*1 + 40*2)/3 = 30
    const result = predictHybridVigor({ parentATraitValue: 100, parentBTraitValue: 100, sameLineage: false, historicalAvgHeterosisPercent: 40 });
    expect(result.heterosisPercent).toBe(30);
    expect(result.predictedVigorScore).toBe(130);
    expect(result.breakdown).toEqual([
      { signal: 'geneticDivergence', contributionPercent: 10 },
      { signal: 'historicalRealizedHeterosis', contributionPercent: 40 },
    ]);
  });

  it('ignores historical data entirely when explicitly null, falling back to the pure heuristic', () => {
    const withNull = predictHybridVigor({ parentATraitValue: 100, parentBTraitValue: 100, sameLineage: false, historicalAvgHeterosisPercent: null });
    const withoutField = predictHybridVigor({ parentATraitValue: 100, parentBTraitValue: 100, sameLineage: false });
    expect(withNull).toEqual(withoutField);
  });

  it('handles unequal parent trait values correctly in the mid-parent calculation', () => {
    const result = predictHybridVigor({ parentATraitValue: 30, parentBTraitValue: 90, sameLineage: false });
    expect(result.midParentValue).toBe(60);
    expect(result.predictedVigorScore).toBe(66); // 60 * 1.10
  });
});
