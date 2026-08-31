import { describe, expect, it } from 'vitest';
import { classifyCorrelationStrength, computeTraitCorrelation } from '../../src/modules/breedingAnalytics/traitCorrelation';

describe('traitCorrelation.classifyCorrelationStrength', () => {
  it('classifies exactly 0.7 (and -0.7) as strong, inclusive of the boundary', () => {
    expect(classifyCorrelationStrength(0.7)).toBe('strong');
    expect(classifyCorrelationStrength(-0.7)).toBe('strong');
  });

  it('classifies just below 0.7 as moderate, not strong', () => {
    expect(classifyCorrelationStrength(0.6999)).toBe('moderate');
    expect(classifyCorrelationStrength(-0.6999)).toBe('moderate');
  });

  it('classifies exactly 0.4 (and -0.4) as moderate, inclusive of the boundary', () => {
    expect(classifyCorrelationStrength(0.4)).toBe('moderate');
    expect(classifyCorrelationStrength(-0.4)).toBe('moderate');
  });

  it('classifies just below 0.4 as weak, not moderate', () => {
    expect(classifyCorrelationStrength(0.3999)).toBe('weak');
    expect(classifyCorrelationStrength(-0.3999)).toBe('weak');
  });
});

describe('traitCorrelation.computeTraitCorrelation', () => {
  it('reports insufficient_data with fewer than 3 pairs', () => {
    expect(computeTraitCorrelation([])).toEqual({ correlation: null, sampleSize: 0, strength: 'insufficient_data' });
    expect(computeTraitCorrelation([{ parentValue: 1, childValue: 1 }])).toEqual({ correlation: null, sampleSize: 1, strength: 'insufficient_data' });
    expect(computeTraitCorrelation([{ parentValue: 1, childValue: 1 }, { parentValue: 2, childValue: 2 }])).toEqual({
      correlation: null,
      sampleSize: 2,
      strength: 'insufficient_data',
    });
  });

  it('computes a perfect positive correlation for perfectly linearly related values', () => {
    const pairs = [
      { parentValue: 10, childValue: 20 },
      { parentValue: 20, childValue: 40 },
      { parentValue: 30, childValue: 60 },
      { parentValue: 40, childValue: 80 },
    ];
    const result = computeTraitCorrelation(pairs);
    expect(result.correlation).toBe(1);
    expect(result.sampleSize).toBe(4);
    expect(result.strength).toBe('strong');
  });

  it('computes a perfect negative correlation for perfectly inversely related values', () => {
    const pairs = [
      { parentValue: 10, childValue: 40 },
      { parentValue: 20, childValue: 30 },
      { parentValue: 30, childValue: 20 },
      { parentValue: 40, childValue: 10 },
    ];
    const result = computeTraitCorrelation(pairs);
    expect(result.correlation).toBe(-1);
    expect(result.strength).toBe('strong');
  });

  it('reports zero/weak when one series has no variance at all (degenerate, not a divide-by-zero crash)', () => {
    const pairs = [
      { parentValue: 10, childValue: 5 },
      { parentValue: 10, childValue: 8 },
      { parentValue: 10, childValue: 3 },
    ];
    const result = computeTraitCorrelation(pairs);
    expect(result.correlation).toBe(0);
    expect(result.strength).toBe('weak');
  });

  it('classifies a weak correlation (below 0.4 magnitude) correctly', () => {
    const result = computeTraitCorrelation([
      { parentValue: 1, childValue: 5 },
      { parentValue: 2, childValue: 1 },
      { parentValue: 3, childValue: 8 },
      { parentValue: 4, childValue: 2 },
    ]);
    expect(Math.abs(result.correlation as number)).toBeLessThan(0.4);
    expect(result.strength).toBe('weak');
  });

  it('classifies a moderate correlation (0.4-0.7 magnitude) correctly', () => {
    const result = computeTraitCorrelation([
      { parentValue: 1, childValue: 3 },
      { parentValue: 2, childValue: 1 },
      { parentValue: 3, childValue: 5 },
      { parentValue: 4, childValue: 2 },
      { parentValue: 5, childValue: 6 },
    ]);
    const magnitude = Math.abs(result.correlation as number);
    expect(magnitude).toBeGreaterThanOrEqual(0.4);
    expect(magnitude).toBeLessThan(0.7);
    expect(result.strength).toBe('moderate');
  });
});
