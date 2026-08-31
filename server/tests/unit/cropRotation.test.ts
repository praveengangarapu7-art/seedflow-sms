import { describe, expect, it } from 'vitest';
import { suggestCropRotation } from '../../src/modules/climateSmartSelection/cropRotation';

describe('cropRotation.suggestCropRotation', () => {
  it('returns no suggestions when there is no planting history', () => {
    expect(suggestCropRotation(null)).toEqual([]);
  });

  it('returns no suggestions for a crop outside the known crop universe', () => {
    expect(suggestCropRotation('Quinoa')).toEqual([]);
  });

  it('suggests the legume (Groundnut) first after a cereal crop', () => {
    const result = suggestCropRotation('Paddy');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].crop).toBe('Groundnut');
    expect(result[0].reason).toMatch(/Paddy/);
  });

  it('suggests the legume first after the fiber crop too', () => {
    const result = suggestCropRotation('Cotton');
    expect(result[0].crop).toBe('Groundnut');
  });

  it('never suggests the same crop that was just planted', () => {
    const result = suggestCropRotation('Paddy');
    expect(result.map((r) => r.crop)).not.toContain('Paddy');
  });

  it('never suggests a crop from the same category as the last one', () => {
    const result = suggestCropRotation('Paddy'); // cereal
    expect(result.map((r) => r.crop)).not.toContain('Maize'); // also cereal
  });

  it('suggests a cereal after a legume, since legumes replenish nitrogen for a cereal to use', () => {
    const result = suggestCropRotation('Groundnut');
    expect(result.map((r) => r.crop)).toEqual(expect.arrayContaining(['Paddy']));
    expect(result.map((r) => r.crop)).not.toContain('Groundnut');
  });

  it('returns at most 2 suggestions', () => {
    const result = suggestCropRotation('Tomato');
    expect(result.length).toBeLessThanOrEqual(2);
  });
});
