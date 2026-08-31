import { describe, expect, it } from 'vitest';
import {
  calculateSeedQuantity,
  getAgroAdvisory,
  getSuitableSoilsForCrop,
} from '../../src/modules/cropPlanning/cropPlanning.validation';

describe('cropPlanning.validation', () => {
  describe('calculateSeedQuantity', () => {
    it('applies the known per-crop seed rate', () => {
      expect(calculateSeedQuantity('Paddy', 1)).toBe(20);
      expect(calculateSeedQuantity('Maize', 1)).toBe(8);
      expect(calculateSeedQuantity('Cotton', 1)).toBe(5);
      expect(calculateSeedQuantity('Groundnut', 1)).toBe(40);
      expect(calculateSeedQuantity('Tomato', 1)).toBe(0.2);
    });

    it('scales linearly with target area', () => {
      expect(calculateSeedQuantity('Paddy', 3)).toBe(60);
      expect(calculateSeedQuantity('Maize', 2.5)).toBe(20);
    });

    it('falls back to the default rate for an unrecognized crop', () => {
      expect(calculateSeedQuantity('Sorghum', 1)).toBe(15);
    });

    it('returns 0 for 0 acres', () => {
      expect(calculateSeedQuantity('Paddy', 0)).toBe(0);
    });

    it('rounds to 2 decimal places', () => {
      expect(calculateSeedQuantity('Tomato', 3)).toBeCloseTo(0.6, 2);
    });
  });

  describe('getAgroAdvisory', () => {
    it('returns crop-specific guidance for a known crop', () => {
      const advisory = getAgroAdvisory('Paddy');
      expect(advisory.spacing).toBe('20cm x 15cm');
      expect(advisory.suitableSoils).toContain('clay');
    });

    it('returns a generic fallback for an unrecognized crop', () => {
      const advisory = getAgroAdvisory('Sorghum');
      expect(advisory.idealSowingWindow).toMatch(/consult the local/i);
      expect(advisory.suitableSoils).toEqual([]);
    });
  });

  describe('getSuitableSoilsForCrop', () => {
    it('returns the known suitable soils for a recognized crop', () => {
      expect(getSuitableSoilsForCrop('Cotton')).toEqual(['black', 'loamy']);
    });

    it('returns an empty array for an unrecognized crop', () => {
      expect(getSuitableSoilsForCrop('Sorghum')).toEqual([]);
    });
  });
});
