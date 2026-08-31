import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/errors';
import { computeResultValue, isPassingResult } from '../../src/modules/labTesting/labTesting.validation';

// Pure logic, no database — this is the "validation rule" the mutation
// testing config targets (see stryker.conf.json), so boundary conditions
// here matter more than usual: a mutant that flips `>=` to `>` on the
// certification threshold should be caught by the exact-boundary cases.
describe('labTesting.validation', () => {
  describe('computeResultValue', () => {
    it('computes germination rate as a percentage rounded to 1 decimal', () => {
      expect(computeResultValue('germination', { sampleSize: 100, germinatedCount: 92 } as any)).toBe(92);
      expect(computeResultValue('germination', { sampleSize: 300, germinatedCount: 277 } as any)).toBeCloseTo(92.3, 1);
    });

    it('computes purity rate from weights', () => {
      expect(computeResultValue('purity', { sampleWeight: 100, pureSeedWeight: 98 } as any)).toBe(98);
    });

    it('allows pureSeedWeight to exactly equal sampleWeight (100% purity is valid, not "exceeding")', () => {
      expect(computeResultValue('purity', { sampleWeight: 50, pureSeedWeight: 50 } as any)).toBe(100);
    });

    it('allows count to exactly equal sampleSize (100% germination is valid, not "exceeding")', () => {
      expect(computeResultValue('germination', { sampleSize: 50, germinatedCount: 50 } as any)).toBe(100);
    });

    it('allows a count of exactly 0 (a total-failure result is valid data, not an input error)', () => {
      expect(computeResultValue('germination', { sampleSize: 50, germinatedCount: 0 } as any)).toBe(0);
    });

    it('allows a pureSeedWeight of exactly 0 (0% purity is valid data, not an input error)', () => {
      expect(computeResultValue('purity', { sampleWeight: 50, pureSeedWeight: 0 } as any)).toBe(0);
    });

    it('computes vigor rate the same way as germination', () => {
      expect(computeResultValue('vigor', { sampleSize: 100, vigorCount: 75 } as any)).toBe(75);
    });

    it('rejects a non-positive sample size', () => {
      expect(() => computeResultValue('germination', { sampleSize: 0, germinatedCount: 0 } as any)).toThrow(ValidationError);
      expect(() => computeResultValue('germination', { sampleSize: -5, germinatedCount: 0 } as any)).toThrow(ValidationError);
    });

    it('rejects a count greater than the sample size', () => {
      expect(() => computeResultValue('germination', { sampleSize: 10, germinatedCount: 11 } as any)).toThrow(
        /germinatedCount cannot exceed sampleSize/,
      );
    });

    it('rejects a negative count', () => {
      expect(() => computeResultValue('germination', { sampleSize: 10, germinatedCount: -1 } as any)).toThrow(
        /germinatedCount must be a non-negative integer/,
      );
    });

    it('rejects pureSeedWeight greater than sampleWeight', () => {
      expect(() => computeResultValue('purity', { sampleWeight: 10, pureSeedWeight: 11 } as any)).toThrow(
        /pureSeedWeight cannot exceed sampleWeight/,
      );
    });

    it('rejects a negative pureSeedWeight', () => {
      expect(() => computeResultValue('purity', { sampleWeight: 10, pureSeedWeight: -1 } as any)).toThrow(
        /pureSeedWeight must be a non-negative number/,
      );
    });

    it('rejects a non-positive sampleWeight', () => {
      expect(() => computeResultValue('purity', { sampleWeight: 0, pureSeedWeight: 0 } as any)).toThrow(
        /sampleWeight must be a positive number/,
      );
    });

    it('rejects a non-integer sample size', () => {
      expect(() => computeResultValue('germination', { sampleSize: 10.5, germinatedCount: 5 } as any)).toThrow(ValidationError);
    });

    // germination and vigor share the same sampleSize/count validation branch
    // internally — exercised separately here so a bug specific to one
    // testType's wiring can't hide behind the other's passing tests.
    it('rejects a non-positive sample size for vigor', () => {
      expect(() => computeResultValue('vigor', { sampleSize: 0, vigorCount: 0 } as any)).toThrow(ValidationError);
    });

    it('rejects a vigorCount greater than the sample size', () => {
      expect(() => computeResultValue('vigor', { sampleSize: 10, vigorCount: 11 } as any)).toThrow(
        /vigorCount cannot exceed sampleSize/,
      );
    });

    it('rejects a negative vigorCount', () => {
      expect(() => computeResultValue('vigor', { sampleSize: 10, vigorCount: -1 } as any)).toThrow(
        /vigorCount must be a non-negative integer/,
      );
    });

    it('rejects a non-integer sample size for vigor', () => {
      expect(() => computeResultValue('vigor', { sampleSize: 10.5, vigorCount: 5 } as any)).toThrow(ValidationError);
    });
  });

  describe('isPassingResult', () => {
    it('passes at exactly the germination threshold (85%)', () => {
      expect(isPassingResult('germination', 85)).toBe(true);
    });

    it('fails just below the germination threshold', () => {
      expect(isPassingResult('germination', 84.9)).toBe(false);
    });

    it('passes at exactly the purity threshold (98%)', () => {
      expect(isPassingResult('purity', 98)).toBe(true);
    });

    it('fails just below the purity threshold', () => {
      expect(isPassingResult('purity', 97.9)).toBe(false);
    });

    it('passes at exactly the vigor threshold (70%)', () => {
      expect(isPassingResult('vigor', 70)).toBe(true);
    });

    it('fails just below the vigor threshold', () => {
      expect(isPassingResult('vigor', 69.9)).toBe(false);
    });

    it('passes comfortably above every threshold', () => {
      expect(isPassingResult('germination', 100)).toBe(true);
      expect(isPassingResult('purity', 100)).toBe(true);
      expect(isPassingResult('vigor', 100)).toBe(true);
    });
  });
});
