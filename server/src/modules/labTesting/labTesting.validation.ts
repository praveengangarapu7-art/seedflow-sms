import { ValidationError } from '../../errors';
import { CERTIFICATION_THRESHOLDS, type TestMetrics, type TestType } from './labTesting.types';

/**
 * Pure calculation + input validation for a lab test result — deliberately
 * kept dependency-free (no pool/DB import) so it can be unit- and
 * mutation-tested in isolation from the I/O half of recording a result.
 */
export function computeResultValue(testType: TestType, metrics: TestMetrics): number {
  if (testType === 'purity') {
    const { sampleWeight, pureSeedWeight } = metrics as { sampleWeight: number; pureSeedWeight: number };
    if (!Number.isFinite(Number(sampleWeight)) || Number(sampleWeight) <= 0) {
      throw new ValidationError('sampleWeight must be a positive number');
    }
    if (!Number.isFinite(Number(pureSeedWeight)) || Number(pureSeedWeight) < 0) {
      throw new ValidationError('pureSeedWeight must be a non-negative number');
    }
    if (Number(pureSeedWeight) > Number(sampleWeight)) {
      throw new ValidationError('pureSeedWeight cannot exceed sampleWeight');
    }
    return Math.round((Number(pureSeedWeight) / Number(sampleWeight)) * 1000) / 10;
  }

  // germination and vigor share the same sampleSize/count-based shape
  const countField = testType === 'germination' ? 'germinatedCount' : 'vigorCount';
  const { sampleSize } = metrics as { sampleSize: number };
  const count = (metrics as unknown as Record<string, number>)[countField];
  if (!Number.isInteger(Number(sampleSize)) || Number(sampleSize) <= 0) {
    throw new ValidationError('sampleSize must be a positive integer');
  }
  if (!Number.isInteger(Number(count)) || Number(count) < 0) {
    throw new ValidationError(`${countField} must be a non-negative integer`);
  }
  if (Number(count) > Number(sampleSize)) {
    throw new ValidationError(`${countField} cannot exceed sampleSize`);
  }
  return Math.round((Number(count) / Number(sampleSize)) * 1000) / 10;
}

/** The certification pass/fail rule itself — a result at exactly the threshold passes. */
export function isPassingResult(testType: TestType, resultValue: number): boolean {
  return resultValue >= CERTIFICATION_THRESHOLDS[testType];
}
