import { describe, expect, it } from 'vitest';
import { computeOverallScore } from '../../src/modules/partners/partnerScoring';

describe('partnerScoring.computeOverallScore', () => {
  it('returns null when there is no completed-order history yet', () => {
    expect(computeOverallScore({ totalOrders: 0, fulfilledOrders: 0, onTimeOrders: 0, avgQualityRating: null })).toBeNull();
  });

  it('scores a perfect record at 100', () => {
    const score = computeOverallScore({ totalOrders: 4, fulfilledOrders: 4, onTimeOrders: 4, avgQualityRating: 5 });
    expect(score).toBe(100);
  });

  it('scores a fully-disputed, always-late record at 0', () => {
    const score = computeOverallScore({ totalOrders: 3, fulfilledOrders: 0, onTimeOrders: 0, avgQualityRating: 0 });
    expect(score).toBe(0);
  });

  it('weights fulfillment at 40%, on-time at 30%, and quality at 30%', () => {
    // fulfillmentRate=1, onTimeRate=0, qualityScore=0 -> 0.4*1 = 40
    expect(computeOverallScore({ totalOrders: 2, fulfilledOrders: 2, onTimeOrders: 0, avgQualityRating: 0 })).toBe(40);
    // fulfillmentRate=0, onTimeRate=1, qualityScore=fulfillmentRate(0) since avgQualityRating is null -> 0.3*1 = 30
    expect(computeOverallScore({ totalOrders: 2, fulfilledOrders: 0, onTimeOrders: 2, avgQualityRating: null })).toBe(30);
  });

  it('falls back to the fulfillment rate for quality when no quality rating has been recorded', () => {
    // fulfillmentRate=1, onTimeRate=1, qualityScore falls back to fulfillmentRate(1) -> full 100
    const withNullQuality = computeOverallScore({ totalOrders: 1, fulfilledOrders: 1, onTimeOrders: 1, avgQualityRating: null });
    expect(withNullQuality).toBe(100);
  });

  it('a single dispute visibly hurts more than a single late-but-undisputed delivery', () => {
    // 1 fulfilled, on-time, quality 5; 1 disputed, on-time, quality 3 -> total 2
    const disputedCase = computeOverallScore({ totalOrders: 2, fulfilledOrders: 1, onTimeOrders: 2, avgQualityRating: 4 });
    // 2 fulfilled but one was late; quality still averages 4
    const lateCase = computeOverallScore({ totalOrders: 2, fulfilledOrders: 2, onTimeOrders: 1, avgQualityRating: 4 });
    expect(disputedCase).toBeLessThan(lateCase!);
  });

  it('rounds to one decimal place', () => {
    const score = computeOverallScore({ totalOrders: 3, fulfilledOrders: 2, onTimeOrders: 2, avgQualityRating: 4 });
    expect(Number.isInteger(score! * 10)).toBe(true);
  });
});
