import { describe, expect, it } from 'vitest';
import { computeDemandScore, computeSuggestedPrice } from '../../src/modules/marketIntelligence/demandScoring';

describe('demandScoring.computeDemandScore', () => {
  it('returns a neutral 50/maintain result with an empty breakdown when no signals are available', () => {
    const result = computeDemandScore({});
    expect(result).toEqual({ score: 50, recommendedAction: 'maintain', breakdown: [] });
  });

  it('pushes the score up for a variety with strong adoption and repeat-request rates', () => {
    const result = computeDemandScore({ adoptionRatePercent: 90, repeatRequestRatePercent: 90 });
    expect(result.score).toBeGreaterThan(50);
    expect(result.recommendedAction).toBe('increase_production');
    expect(result.breakdown.map((b) => b.signal).sort()).toEqual(['adoptionRate', 'repeatRequestRate']);
  });

  it('pushes the score down for a variety with weak adoption and repeat-request rates', () => {
    const result = computeDemandScore({ adoptionRatePercent: 5, repeatRequestRatePercent: 5 });
    expect(result.score).toBeLessThan(50);
    expect(result.recommendedAction).toBe('decrease_production');
  });

  it('treats exactly 50% adoption/repeat-request as neutral (zero deviation)', () => {
    const result = computeDemandScore({ adoptionRatePercent: 50, repeatRequestRatePercent: 50 });
    expect(result.score).toBe(50);
    expect(result.recommendedAction).toBe('maintain');
  });

  it('clamps an extreme positive price trend at +50 rather than letting it dominate unbounded', () => {
    const moderate = computeDemandScore({ priceTrendPercent: 50 });
    const extreme = computeDemandScore({ priceTrendPercent: 500 });
    expect(extreme.score).toBe(moderate.score);
    expect(extreme.score).toBe(100); // weight 15, only signal: deviation +50 -> score 50+50
  });

  it('clamps an extreme NEGATIVE price trend at -50, not +50 — the min and max bounds are independent', () => {
    const result = computeDemandScore({ priceTrendPercent: -500 });
    expect(result.score).toBe(0); // deviation clamped to -50 -> score 50-50 = 0, not 100
    expect(result.breakdown[0]).toEqual({ signal: 'priceTrend', weight: 15, deviation: -50 });
  });

  it('clamps an extreme positive ministry growth figure the same way', () => {
    const moderate = computeDemandScore({ ministryGrowthPercent: 50 });
    const extreme = computeDemandScore({ ministryGrowthPercent: 5000 });
    expect(extreme.score).toBe(moderate.score);
    expect(extreme.score).toBe(100);
  });

  it('clamps an extreme negative ministry growth figure at -50, not +50', () => {
    const moderate = computeDemandScore({ ministryGrowthPercent: -50 });
    const extreme = computeDemandScore({ ministryGrowthPercent: -5000 });
    expect(extreme.score).toBe(moderate.score);
    expect(extreme.score).toBe(0);
    expect(extreme.breakdown[0]).toEqual({ signal: 'ministryGrowth', weight: 20, deviation: -50 });
  });

  it('maps each weather outlook to its documented deviation direction', () => {
    const favorable = computeDemandScore({ weatherOutlook: 'favorable' });
    const normal = computeDemandScore({ weatherOutlook: 'normal' });
    const adverse = computeDemandScore({ weatherOutlook: 'adverse' });
    const severe = computeDemandScore({ weatherOutlook: 'severe' });
    expect(favorable.score).toBeGreaterThan(normal.score);
    expect(normal.score).toBe(50);
    expect(adverse.score).toBeLessThan(normal.score);
    expect(severe.score).toBeLessThan(adverse.score);
  });

  it('lowers the score as insurance claims increase, capped at a maximum penalty', () => {
    const fewClaims = computeDemandScore({ insuranceClaimsCount: 2 });
    const manyClaims = computeDemandScore({ insuranceClaimsCount: 20 });
    const extremeClaims = computeDemandScore({ insuranceClaimsCount: 1000 });
    expect(fewClaims.score).toBeLessThan(50);
    expect(manyClaims.score).toBeLessThan(fewClaims.score);
    expect(extremeClaims.score).toBe(manyClaims.score); // capped
    expect(fewClaims.breakdown[0]).toEqual({ signal: 'insuranceRisk', weight: 10, deviation: -10 });
  });

  it('only weights the signals actually provided, not a fixed set', () => {
    const oneSignal = computeDemandScore({ adoptionRatePercent: 100 });
    // A single maxed-out signal swings the score by its FULL deviation when nothing else is present.
    expect(oneSignal.score).toBe(100);
  });

  it('dilutes a strong signal toward neutral once a second, neutral signal joins the average', () => {
    const result = computeDemandScore({ adoptionRatePercent: 100, repeatRequestRatePercent: 50 });
    // adoptionRate: weight 30, deviation +50. repeatRequestRate: weight 15, deviation 0 (50% is neutral).
    // weighted avg = (50*30 + 0*15) / 45 = 33.3; score = 50+33.3 = 83.3.
    expect(result.score).toBe(83.3);
    expect(result.recommendedAction).toBe('increase_production');
  });

  it('combines multiple mixed signals into a single weighted-average score', () => {
    const result = computeDemandScore({ adoptionRatePercent: 100, insuranceClaimsCount: 10 });
    // adoptionRate: weight 30, deviation +50. insuranceRisk: weight 10, deviation -50.
    // weighted avg = (50*30 + -50*10) / 40 = 25; score = 50+25 = 75.
    expect(result.score).toBe(75);
    expect(result.recommendedAction).toBe('increase_production');
  });

  it('recommends increase_production only at or above the 65 threshold', () => {
    const justBelow = computeDemandScore({ adoptionRatePercent: 50 + 14.9 });
    const atThreshold = computeDemandScore({ adoptionRatePercent: 50 + 15 });
    expect(justBelow.recommendedAction).toBe('maintain');
    expect(atThreshold.recommendedAction).toBe('increase_production');
  });

  it('recommends decrease_production only at or below the 35 threshold', () => {
    const justAbove = computeDemandScore({ adoptionRatePercent: 50 - 14.9 });
    const atThreshold = computeDemandScore({ adoptionRatePercent: 50 - 15 });
    expect(justAbove.recommendedAction).toBe('maintain');
    expect(atThreshold.recommendedAction).toBe('decrease_production');
  });
});

describe('demandScoring.computeSuggestedPrice', () => {
  it('returns null when no base price has ever been recorded', () => {
    expect(computeSuggestedPrice(null, 80)).toBeNull();
    expect(computeSuggestedPrice(undefined, 80)).toBeNull();
  });

  it('returns the base price unchanged at a neutral demand score of 50', () => {
    expect(computeSuggestedPrice(100, 50)).toBe(100);
  });

  it('suggests a 15% premium at the maximum demand score of 100', () => {
    expect(computeSuggestedPrice(100, 100)).toBe(115);
  });

  it('suggests a 15% discount at the minimum demand score of 0', () => {
    expect(computeSuggestedPrice(100, 0)).toBe(85);
  });

  it('clamps an out-of-range demand score rather than extrapolating past the intended band', () => {
    expect(computeSuggestedPrice(100, 200)).toBe(115);
    expect(computeSuggestedPrice(100, -50)).toBe(85);
  });
});
