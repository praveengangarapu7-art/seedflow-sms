/**
 * Shared period-filter utilities used across the Procurement and Warehouse
 * modules — every list page, dashboard and report that carries the period
 * selector in its header.
 *
 * Lets every page filter its records — and recompute its KPIs — by a
 * specific period: Today, This Week, This Month, This Quarter, This Year,
 * or All Time.
 */

export type PeriodValue = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';

export interface PeriodOption {
  label: string;
  value: PeriodValue;
}

/** Standard period choices, in display order. Reuse directly in a FilterBar `filters` entry. */
export const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'All time',    value: 'all' },
  { label: 'Today',       value: 'today' },
  { label: 'This week',   value: 'week' },
  { label: 'This month',  value: 'month' },
  { label: 'This quarter', value: 'quarter' },
  { label: 'This year',   value: 'year' },
];

/**
 * The app's mock data is written as of this date (matches the reference date
 * already used for RFQ deadline countdowns). All "This Week / Month / Quarter / Year"
 * calculations are anchored here so every page agrees on what "now" means.
 */
export const MOCK_TODAY = new Date(2026, 3, 29); // 29 Apr 2026

/**
 * Per-module reference dates.
 *
 * The modules' demo datasets were each written as of a different point in the
 * 2026 season — procurement and warehouse records sit in April, processing
 * batches in May–June, R&D trials in June–July, and the laboratory fixtures
 * are generated from the real clock at load time. Anchoring every module to
 * one date would mean "This month" showed an empty table on three of them,
 * which reads as a broken filter rather than an honest empty result. Each
 * module therefore filters against the date its own records were written for.
 */
export const PROCESSING_TODAY = new Date(2026, 5, 14); // 14 Jun 2026
export const RD_TODAY = new Date(2026, 5, 30);          // 30 Jun 2026 — the densest
                                                       // month across trials, nurseries
                                                       // and phenotyping observations
/** Laboratory fixtures are built with isoDaysFromNow(), so "now" is the real clock. */
export const labToday = (): Date => new Date();

/**
 * Parses every date-string shape the mock data uses:
 *  - ISO:      '2026-04-05' (with or without a time)
 *  - Long:     '24 Apr 2026'
 *  - Relative: 'today', 'yesterday', '3 days ago', '2 weeks ago'
 *  - Relative with a clock time, as the warehouse logs write them:
 *              '09:14 AM, today', '04:18 AM, 2 days ago'
 *
 * Relative phrases resolve against `referenceDate` (the shared MOCK_TODAY by
 * default) rather than the real clock, so a demo record written as "today"
 * lands in the same period as a record dated 29 Apr 2026 — otherwise the two
 * halves of the same page would disagree about what "This week" means.
 *
 * Returns null if the value is missing or unparsable.
 */
export function parseFlexibleDate(
  value: string | undefined | null,
  referenceDate: Date = MOCK_TODAY
): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  // Relative phrases, optionally prefixed with a clock time that we can drop:
  // '09:14 AM, today' -> 'today'. Everything is measured in whole days back
  // from the reference date.
  const relative = trimmed.replace(/^\d{1,2}:\d{2}\s*(?:AM|PM)?\s*,\s*/i, '').toLowerCase();
  const daysBack = relativeDaysBack(relative);
  if (daysBack !== null) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - daysBack);
    return d;
  }

  // ISO format: yyyy-MM-dd (optionally with a time component)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const iso = trimmed.length > 10 ? trimmed : `${trimmed}T00:00:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  // Long format: 'dd MMM yyyy', e.g. '24 Apr 2026'
  const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const mon = MONTHS[match[2].slice(0, 3).toLowerCase()];
    const year = parseInt(match[3], 10);
    if (mon !== undefined) return new Date(year, mon, day);
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * How many days before "now" a relative phrase points to, or null when the
 * text is not a relative phrase at all.
 */
function relativeDaysBack(text: string): number | null {
  if (text === 'today' || text === 'just now') return 0;
  if (text === 'yesterday') return 1;

  const match = text.match(/^(?:about\s+)?(a|an|\d+)\s+(minute|hour|day|week|month)s?\s+ago$/);
  if (!match) return null;

  const amount = match[1] === 'a' || match[1] === 'an' ? 1 : parseInt(match[1], 10);
  switch (match[2]) {
    case 'minute':
    case 'hour':
      return 0; // still the same day
    case 'day':
      return amount;
    case 'week':
      return amount * 7;
    case 'month':
      return amount * 30;
    default:
      return null;
  }
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Returns true if `dateStr` falls within the given period, relative to `referenceDate`.
 * A missing/unparsable date is excluded from every period except 'all'.
 */
export function isDateInPeriod(
  dateStr: string | undefined | null,
  period: PeriodValue,
  referenceDate: Date = MOCK_TODAY
): boolean {
  if (period === 'all') return true;

  const d = parseFlexibleDate(dateStr, referenceDate);
  if (!d) return false;

  switch (period) {
    case 'today':
      return d.toDateString() === referenceDate.toDateString();
    case 'week':
      return d >= startOfWeek(referenceDate) && d <= endOfWeek(referenceDate);
    case 'month':
      return d.getFullYear() === referenceDate.getFullYear() && d.getMonth() === referenceDate.getMonth();
    case 'quarter': {
      const refQ = Math.floor(referenceDate.getMonth() / 3);
      const dQ = Math.floor(d.getMonth() / 3);
      return d.getFullYear() === referenceDate.getFullYear() && dQ === refQ;
    }
    case 'year':
      return d.getFullYear() === referenceDate.getFullYear();
    default:
      return true;
  }
}

/**
 * For records whose only temporal marker is a year (a variety's release year,
 * say). The year is the finest granularity available, so any period narrower
 * than a year is answered at year resolution rather than pretending to a
 * precision the data does not have.
 */
export function isYearInPeriod(
  year: number | undefined | null,
  period: PeriodValue,
  referenceDate: Date = MOCK_TODAY
): boolean {
  if (period === 'all') return true;
  if (year === undefined || year === null) return false;
  return year === referenceDate.getFullYear();
}

export function periodLabel(period: PeriodValue): string {
  return PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? 'All time';
}
