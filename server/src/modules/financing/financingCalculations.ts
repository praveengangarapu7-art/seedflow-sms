// Pure logic — zero DB imports, mirroring hashChain.ts/demandScoring.ts's
// separation of calculation from data-fetching elsewhere in this app. The
// interest math itself mirrors storage's existing accrued-cost pattern
// (storageAssignments.service.ts's getStorageCosts: rate * quantity *
// elapsed-days) — here, rate * principal * elapsed-time. Simple interest,
// not compounding: appropriate for the short, single-season loan terms
// this app models, and far more transparent to a borrower than a
// compounding schedule would be.

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Simple interest accrued between two dates. Never negative — a `toDate`
 * before `fromDate` (e.g. a clock/data anomaly) accrues nothing rather than
 * a nonsensical negative interest figure.
 */
export function computeAccruedInterest(principalAmount: number, annualInterestRatePercent: number, fromDate: Date, toDate: Date): number {
  const daysElapsed = Math.max(0, Math.ceil((toDate.getTime() - fromDate.getTime()) / MILLISECONDS_PER_DAY));
  const interest = principalAmount * (annualInterestRatePercent / 100) * (daysElapsed / DAYS_PER_YEAR);
  return round2(interest);
}

export function computeAmountDue(principalAmount: number, accruedInterest: number): number {
  return round2(principalAmount + accruedInterest);
}

/**
 * The advance rate a warehouse-receivables loan is actually offered at —
 * cash advanced as a percentage of the underlying receivable's full value.
 * A real, standard receivables-financing (factoring) concept: the lender
 * never advances 100%, holding back a margin against the risk the
 * receivable doesn't fully collect.
 */
export function computeAdvanceRatePercent(principalAmount: number, receivableAmount: number): number | null {
  if (receivableAmount <= 0) return null;
  return round2((principalAmount / receivableAmount) * 100);
}
