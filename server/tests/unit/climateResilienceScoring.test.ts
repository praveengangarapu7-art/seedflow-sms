import { describe, expect, it } from 'vitest';
import { computeClimateResilienceScore } from '../../src/modules/climateSmartSelection/climateResilienceScoring';

describe('climateResilienceScoring.computeClimateResilienceScore', () => {
  it('returns a null score with an empty breakdown when no signals are available', () => {
    expect(computeClimateResilienceScore({})).toEqual({ score: null, breakdown: [] });
  });

  it('scores tolerance directly when it is the only signal', () => {
    const result = computeClimateResilienceScore({ toleranceScore: 80 });
    expect(result.score).toBe(80);
    expect(result.breakdown).toEqual([{ signal: 'stressTolerance', weight: 60, value: 80 }]);
  });

  it('scores adaptation track record directly when it is the only signal', () => {
    const result = computeClimateResilienceScore({ adaptationTrackRecordScore: 50 });
    expect(result.score).toBe(50);
    expect(result.breakdown).toEqual([{ signal: 'adaptationTrackRecord', weight: 40, value: 50 }]);
  });

  it('combines both signals into a weighted average, weighted 60/40', () => {
    // (100*60 + 0*40) / 100 = 60
    const result = computeClimateResilienceScore({ toleranceScore: 100, adaptationTrackRecordScore: 0 });
    expect(result.score).toBe(60);
    expect(result.breakdown).toHaveLength(2);
  });

  it('never fabricates a score from a single signal being present — the other stays fully excluded, not zeroed', () => {
    const toleranceOnly = computeClimateResilienceScore({ toleranceScore: 40 });
    const bothWithZeroTrackRecord = computeClimateResilienceScore({ toleranceScore: 40, adaptationTrackRecordScore: 0 });
    expect(toleranceOnly.score).toBe(40);
    expect(bothWithZeroTrackRecord.score).toBeLessThan(40); // explicit 0 pulls the average down, unlike omission
  });
});
