import { describe, expect, it } from 'vitest';
import { computeAccruedInterest, computeAdvanceRatePercent, computeAmountDue } from '../../src/modules/financing/financingCalculations';

describe('financingCalculations.computeAccruedInterest', () => {
  it('accrues exactly one year of simple interest over 365 days', () => {
    // 10,000 principal at 12% annual for a full year -> 1,200.
    const from = new Date('2026-01-01');
    const to = new Date('2027-01-01'); // 365 days later
    expect(computeAccruedInterest(10000, 12, from, to)).toBe(1200);
  });

  it('accrues proportionally for a partial year', () => {
    // 10,000 * 12% * (182/365) = 598.36.
    const from = new Date('2026-01-01');
    const to = new Date('2026-07-02'); // 182 days later
    expect(computeAccruedInterest(10000, 12, from, to)).toBe(598.36);
  });

  it('accrues zero interest when no time has elapsed', () => {
    const date = new Date('2026-01-01');
    expect(computeAccruedInterest(10000, 12, date, date)).toBe(0);
  });

  it('never accrues negative interest when toDate precedes fromDate', () => {
    const from = new Date('2026-06-01');
    const to = new Date('2026-01-01');
    expect(computeAccruedInterest(10000, 12, from, to)).toBe(0);
  });

  it('accrues zero interest at a zero percent rate regardless of elapsed time', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2027-01-01');
    expect(computeAccruedInterest(10000, 0, from, to)).toBe(0);
  });

  it('scales linearly with principal', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2027-01-01');
    const small = computeAccruedInterest(1000, 12, from, to);
    const large = computeAccruedInterest(2000, 12, from, to);
    expect(large).toBe(small * 2);
  });
});

describe('financingCalculations.computeAmountDue', () => {
  it('sums principal and accrued interest', () => {
    expect(computeAmountDue(10000, 1200)).toBe(11200);
  });

  it('returns just the principal when no interest has accrued', () => {
    expect(computeAmountDue(10000, 0)).toBe(10000);
  });
});

describe('financingCalculations.computeAdvanceRatePercent', () => {
  it('computes the percentage of the receivable actually advanced as cash', () => {
    expect(computeAdvanceRatePercent(8000, 10000)).toBe(80);
  });

  it('returns 100 when the full receivable value is advanced', () => {
    expect(computeAdvanceRatePercent(10000, 10000)).toBe(100);
  });

  it('returns null rather than dividing by zero when the receivable amount is zero', () => {
    expect(computeAdvanceRatePercent(0, 0)).toBeNull();
  });
});
