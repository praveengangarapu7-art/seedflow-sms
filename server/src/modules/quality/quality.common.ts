import type { PoolClient } from 'pg';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import { assertValidEmail } from '../../utils/validation';

export const DEPARTMENTS = [
  'procurement',
  'production',
  'rd',
  'laboratory',
  'warehouse',
  'logistics',
  'operations',
  'quality',
  'hr_training',
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const SEVERITIES = ['minor', 'major', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function requireText(value: unknown, field: string, maxLength = 5000): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new ValidationError(`${field} must be at most ${maxLength} characters`);
  return trimmed;
}

export function optionalText(value: unknown, field: string, maxLength = 5000): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requireText(value, field, maxLength);
}

export function requireEmail(value: unknown, field: string): string {
  assertValidEmail(value, field);
  return (value as string).trim().toLowerCase();
}

export function optionalEmail(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requireEmail(value, field);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function requireDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new ValidationError(`${field} must be a date in YYYY-MM-DD format`);
  }
  return value;
}

export function optionalDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requireDate(value, field);
}

/**
 * Next number for a code prefix, incremented atomically. The row lock taken by
 * the upsert serialises concurrent creators, so two requests can never be
 * handed the same code (COUNT(*)+1 would let both read the same count).
 */
export async function nextCode(client: PoolClient, prefix: string, width: number, yearScoped: boolean): Promise<string> {
  const key = yearScoped ? `${prefix}-${new Date().getFullYear()}` : prefix;
  const result = await client.query<{ last_value: number }>(
    `INSERT INTO quality_counters (counter_key, last_value) VALUES ($1, 1)
     ON CONFLICT (counter_key) DO UPDATE SET last_value = quality_counters.last_value + 1
     RETURNING last_value`,
    [key],
  );
  return `${key}-${String(result.rows[0].last_value).padStart(width, '0')}`;
}

export async function assertSeedLotExists(client: PoolClient, seedLotId: string): Promise<{ id: string; lot_code: string }> {
  const result = await client.query<{ id: string; lot_code: string }>('SELECT id, lot_code FROM seed_lots WHERE id = $1', [
    seedLotId,
  ]);
  if (!result.rows[0]) throw new NotFoundError(`Seed lot ${seedLotId} not found`);
  return result.rows[0];
}

/**
 * Called by other modules (allocations, packaging) inside their own
 * transaction, before they move stock. A lot under a quality hold cannot be
 * allocated or packaged until the hold is released — that is what makes the
 * hold a real stop-sale rather than a label.
 */
export async function assertLotNotOnHold(client: PoolClient, seedLotId: string): Promise<void> {
  const result = await client.query<{ reason: string; lot_code: string }>(
    `SELECT h.reason, l.lot_code
       FROM quality_lot_holds h
       JOIN seed_lots l ON l.id = h.seed_lot_id
      WHERE h.seed_lot_id = $1 AND h.released_at IS NULL`,
    [seedLotId],
  );
  if (result.rows[0]) {
    throw new ConflictError(
      `Seed lot ${result.rows[0].lot_code} is on quality hold (${result.rows[0].reason}) — release the hold before allocating or packaging it`,
    );
  }
}

export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86_400_000;
}
