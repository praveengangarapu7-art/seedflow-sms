import { describe, expect, it } from 'vitest';
import { computeGermplasmScore } from '../../src/modules/breedingAnalytics/germplasmScoring';

describe('germplasmScoring.computeGermplasmScore', () => {
  it('returns a zero score with an empty breakdown when no signals are available at all', () => {
    expect(computeGermplasmScore({})).toEqual({ score: 0, breakdown: [] });
  });

  it('scores germination directly as its percentage when it is the only signal', () => {
    const result = computeGermplasmScore({ avgGerminationPercent: 80 });
    expect(result.score).toBe(80);
    expect(result.breakdown).toEqual([{ signal: 'germination', weight: 50, normalizedValue: 80 }]);
  });

  it('caps the multiplication ratio contribution at the documented 5x ceiling', () => {
    const atCap = computeGermplasmScore({ multiplicationRatio: 5 });
    const wayOverCap = computeGermplasmScore({ multiplicationRatio: 50 });
    expect(atCap.score).toBe(100);
    expect(wayOverCap.score).toBe(100);
  });

  it('scales the multiplication ratio linearly below the cap', () => {
    const result = computeGermplasmScore({ multiplicationRatio: 2.5 }); // half of the 5x cap
    expect(result.score).toBe(50);
  });

  it('caps descendant breadth at the documented 20-lot ceiling', () => {
    const atCap = computeGermplasmScore({ descendantCount: 20 });
    const wayOverCap = computeGermplasmScore({ descendantCount: 200 });
    expect(atCap.score).toBe(100);
    expect(wayOverCap.score).toBe(100);
  });

  it('scales descendant breadth linearly below the cap', () => {
    const result = computeGermplasmScore({ descendantCount: 10 }); // half of the 20-lot cap
    expect(result.score).toBe(50);
  });

  it('combines all three signals into a single weighted average, weighted 50/30/20', () => {
    // germination=100 (norm 100, w50), multiplicationRatio=5 (norm 100, w30), descendantCount=0 (norm 0, w20)
    const result = computeGermplasmScore({ avgGerminationPercent: 100, multiplicationRatio: 5, descendantCount: 0 });
    // weighted avg = (100*50 + 100*30 + 0*20) / 100 = 80
    expect(result.score).toBe(80);
    expect(result.breakdown).toHaveLength(3);
  });

  it('only weights the signals actually provided — missing signals are excluded from the average, not treated as zero', () => {
    const withOnlyGermination = computeGermplasmScore({ avgGerminationPercent: 60 });
    const withGerminationAndZeroBreadth = computeGermplasmScore({ avgGerminationPercent: 60, descendantCount: 0 });
    // Explicitly recording zero descendants (weight 20, normalized 0) pulls the average down,
    // whereas omitting the signal entirely leaves the germination-only score untouched.
    expect(withOnlyGermination.score).toBe(60);
    expect(withGerminationAndZeroBreadth.score).toBeLessThan(60);
  });
});
