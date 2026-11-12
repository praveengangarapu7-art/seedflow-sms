import type { CopilotFinding, CopilotRecord, CopilotSeverity, CopilotTone } from './types';

/** Small, null-safe readers: records come from APIs and mock data with varying shapes. */
export function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function arr<T = CopilotRecord>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function obj(value: unknown): CopilotRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as CopilotRecord) : {};
}

/** First non-empty field among several possible names (camelCase and snake_case APIs). */
export function pick(record: CopilotRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    const v = record[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

export function lower(value: unknown): string {
  return str(value).toLowerCase();
}

const DAY_MS = 86_400_000;

/** Days from today to the date (negative = in the past). Null when not a date. */
export function daysFromToday(value: unknown, today: Date = new Date()): number | null {
  const s = str(value);
  if (!s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(t);
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((target - start) / DAY_MS);
}

export function daysBetween(a: unknown, b: unknown): number | null {
  const ta = Date.parse(str(a));
  const tb = Date.parse(str(b));
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / DAY_MS);
}

export function round(n: number, digits = 1): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function pct(part: number, whole: number, digits = 1): number {
  return whole > 0 ? round((100 * part) / whole, digits) : 0;
}

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function qty(n: number, unit = 'kg'): string {
  return `${round(n, 1).toLocaleString('en-IN')} ${unit}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function finding(severity: CopilotSeverity, text: string): CopilotFinding {
  return { severity, text };
}

const RANK: Record<CopilotSeverity, number> = { critical: 0, warning: 1, info: 2, good: 3 };

export function sortFindings(list: CopilotFinding[]): CopilotFinding[] {
  return [...list].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

export function worst(list: CopilotFinding[]): CopilotSeverity {
  return sortFindings(list)[0]?.severity ?? 'good';
}

/** Score tone for a 0-100 "health" score (higher is better). */
export function healthTone(score: number): CopilotTone {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warn';
  return 'bad';
}

/** Score tone for a 0-100 "risk" score (higher is worse). */
export function riskTone(score: number): CopilotTone {
  if (score >= 60) return 'bad';
  if (score >= 30) return 'warn';
  return 'good';
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** Finds which keyword groups a free-text field mentions. */
export function matchKeywords<K extends string>(text: string, groups: Record<K, string[]>): K[] {
  const t = text.toLowerCase();
  return (Object.keys(groups) as K[]).filter((k) => groups[k].some((w) => t.includes(w)));
}

export function unique<T>(list: T[]): T[] {
  return list.filter((v, i) => list.indexOf(v) === i);
}
