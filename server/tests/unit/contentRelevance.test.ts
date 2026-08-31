import { describe, expect, it } from 'vitest';
import { rankByRelevance } from '../../src/modules/farmerEducation/contentRelevance';

describe('contentRelevance.rankByRelevance', () => {
  it('returns items unchanged when no variety is specified', () => {
    const items = [
      { id: 1, crop: 'Paddy', variety: null },
      { id: 2, crop: 'Paddy', variety: 'GoldenPaddy' },
    ];
    expect(rankByRelevance(items)).toEqual(items);
    expect(rankByRelevance(items, null)).toEqual(items);
  });

  it('takes the early-return path (not the partition logic) when no variety is given, verified with an order that would differ if partitioning ran instead', () => {
    // If the early return were skipped, item.variety === variety (null) would
    // match ONLY the second item, reordering the result to [item2, item1] —
    // asserting the ORIGINAL order here is only possible via the early return.
    const items = [
      { id: 1, crop: 'Paddy', variety: 'GoldenPaddy' },
      { id: 2, crop: 'Paddy', variety: null },
    ];
    expect(rankByRelevance(items, null).map((r) => r.id)).toEqual([1, 2]);
    expect(rankByRelevance(items, undefined).map((r) => r.id)).toEqual([1, 2]);
  });

  it('surfaces exact-variety matches before crop-wide entries', () => {
    const cropWide = { id: 1, crop: 'Paddy', variety: null };
    const exactMatch = { id: 2, crop: 'Paddy', variety: 'GoldenPaddy' };
    const result = rankByRelevance([cropWide, exactMatch], 'GoldenPaddy');
    expect(result.map((r) => r.id)).toEqual([2, 1]);
  });

  it('treats a different variety the same as crop-wide content — neither is the requested variety', () => {
    const otherVariety = { id: 1, crop: 'Paddy', variety: 'SilverPaddy' };
    const exactMatch = { id: 2, crop: 'Paddy', variety: 'GoldenPaddy' };
    const result = rankByRelevance([otherVariety, exactMatch], 'GoldenPaddy');
    expect(result.map((r) => r.id)).toEqual([2, 1]);
  });

  it('preserves relative order within each relevance group (stable sort)', () => {
    const items = [
      { id: 1, crop: 'Paddy', variety: 'GoldenPaddy' },
      { id: 2, crop: 'Paddy', variety: null },
      { id: 3, crop: 'Paddy', variety: 'GoldenPaddy' },
      { id: 4, crop: 'Paddy', variety: null },
    ];
    const result = rankByRelevance(items, 'GoldenPaddy');
    expect(result.map((r) => r.id)).toEqual([1, 3, 2, 4]);
  });

  it('returns an empty array unchanged', () => {
    expect(rankByRelevance([], 'GoldenPaddy')).toEqual([]);
  });
});
