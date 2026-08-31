import { ValidationError } from '../../errors';
import { withTransaction } from '../../db/transaction';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { broadcast } from '../../ws/server';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { csvRowsToRecords, mapCsvRecordToSeedLotInput, parseCsv } from './csvImport';
import { createSeedLot, deleteSeedLot, getSeedLotById, updateSeedLot } from './seedLots.service';
import { withAvailability, type CreateSeedLotInput, type SeedLotWithAvailability, type UpdateSeedLotInput } from './seedLots.types';

export const MAX_BATCH_SIZE = 200;

export interface BatchItemResult<T> {
  index: number;
  status: 'created' | 'updated' | 'deleted' | 'failed';
  data?: T;
  error?: string;
}

function assertBatchSize(count: number): void {
  if (count === 0) throw new ValidationError('At least one item is required');
  if (count > MAX_BATCH_SIZE) {
    throw new ValidationError(`Batch size ${count} exceeds the maximum of ${MAX_BATCH_SIZE} items per request`);
  }
}

function countFailures<T>(results: BatchItemResult<T>[]): number {
  return results.filter((r) => r.status === 'failed').length;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

/**
 * Each row is created independently (createSeedLot already runs each in its
 * own transaction) so one bad row never rolls back the rest of the batch —
 * the point of a bulk-with-validation endpoint is partial success with a
 * clear per-row reason, not all-or-nothing.
 */
export async function bulkCreateSeedLots(
  items: CreateSeedLotInput[],
  user: AuthenticatedUser,
): Promise<{ total: number; succeeded: number; failed: number; results: BatchItemResult<SeedLotWithAvailability>[] }> {
  assertBatchSize(items.length);
  const results: BatchItemResult<SeedLotWithAvailability>[] = [];
  for (let index = 0; index < items.length; index += 1) {
    try {
      const created = await createSeedLot(items[index], user);
      results.push({ index, status: 'created', data: withAvailability(created) });
    } catch (err) {
      results.push({ index, status: 'failed', error: errorMessage(err) });
    }
  }
  const failed = countFailures(results);
  return { total: results.length, succeeded: results.length - failed, failed, results };
}

export async function bulkUpdateSeedLots(
  items: { id: string; updates: UpdateSeedLotInput }[],
  user: AuthenticatedUser,
): Promise<{ total: number; succeeded: number; failed: number; results: BatchItemResult<SeedLotWithAvailability>[] }> {
  assertBatchSize(items.length);
  const results: BatchItemResult<SeedLotWithAvailability>[] = [];
  for (let index = 0; index < items.length; index += 1) {
    try {
      const updated = await updateSeedLot(items[index]?.id, items[index]?.updates ?? {}, user);
      results.push({ index, status: 'updated', data: withAvailability(updated) });
    } catch (err) {
      results.push({ index, status: 'failed', error: errorMessage(err) });
    }
  }
  const failed = countFailures(results);
  return { total: results.length, succeeded: results.length - failed, failed, results };
}

export async function bulkDeleteSeedLots(
  ids: string[],
  user: AuthenticatedUser,
): Promise<{ total: number; succeeded: number; failed: number; results: BatchItemResult<{ id: string }>[] }> {
  assertBatchSize(ids.length);
  const results: BatchItemResult<{ id: string }>[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    try {
      await deleteSeedLot(ids[index], user);
      results.push({ index, status: 'deleted', data: { id: ids[index] } });
    } catch (err) {
      results.push({ index, status: 'failed', error: errorMessage(err) });
    }
  }
  const failed = countFailures(results);
  return { total: results.length, succeeded: results.length - failed, failed, results };
}

export interface CsvImportItemResult extends BatchItemResult<SeedLotWithAvailability> {
  rowNumber: number;
}

/**
 * Parses the CSV, maps each row to a CreateSeedLotInput (or a mapping
 * error, without ever touching the DB for that row), then creates the
 * successfully-mapped rows one at a time via the same createSeedLot() path
 * bulkCreateSeedLots uses — so a CSV import gets identical validation,
 * ownership, audit-log, and hash-chain behavior as a single manual create.
 */
export async function importSeedLotsFromCsv(
  csvText: string,
  user: AuthenticatedUser,
): Promise<{ total: number; succeeded: number; failed: number; results: CsvImportItemResult[] }> {
  if (!csvText?.trim()) throw new ValidationError('csvText is required');

  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0) throw new ValidationError('CSV has no header row');
  assertBatchSize(rows.length);

  const records = csvRowsToRecords(headers, rows);
  const results: CsvImportItemResult[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const rowNumber = index + 2; // +1 for the header row, +1 for 1-indexing
    const mapped = mapCsvRecordToSeedLotInput(records[index]);
    if (!mapped.input) {
      results.push({ index, rowNumber, status: 'failed', error: mapped.error ?? 'Invalid row' });
      continue;
    }
    try {
      const created = await createSeedLot(mapped.input, user);
      results.push({ index, rowNumber, status: 'created', data: withAvailability(created) });
    } catch (err) {
      results.push({ index, rowNumber, status: 'failed', error: errorMessage(err) });
    }
  }
  const failed = countFailures(results);
  return { total: results.length, succeeded: results.length - failed, failed, results };
}

// --- Batch "quick actions" (Batch Operations for Seed Lots) ------------
//
// These are the four named bulk buttons the frontend test drives: "Move to
// Storage Zone", "Approve for Sale", "Mark as Expired" (all three are a
// canned UpdateSeedLotInput run through the same updateSeedLot() path as a
// manual edit, so they get identical ownership checks, audit logging, and
// hash-chain entries for free) plus "Print Labels" (a read + audit-log-only
// action — see bulkPrintLabels below). Each item is processed independently,
// same partial-success convention as the other bulk* functions above, and
// each completed item is broadcast over the existing WebSocket inventory
// feed (SEED_LOT_BATCH_PROGRESS) tagged with the caller-supplied actionId so
// the frontend can render a live progress bar instead of only a final
// summary.

export const QUICK_ACTION_TYPES = ['move_zone', 'approve_for_sale', 'mark_expired'] as const;
export type QuickActionType = (typeof QUICK_ACTION_TYPES)[number];

export interface QuickActionItemResult {
  index: number;
  seedLotId: string;
  status: 'succeeded' | 'failed';
  lotCode?: string;
  error?: string;
}

function quickActionUpdates(action: QuickActionType, zone?: string): UpdateSeedLotInput {
  switch (action) {
    case 'move_zone': {
      const trimmed = zone?.trim();
      if (!trimmed) throw new ValidationError('zone is required for the move_zone action');
      return { storageZone: trimmed };
    }
    case 'approve_for_sale':
      return { approvedForSale: true };
    case 'mark_expired':
      return { status: 'expired' };
    default:
      throw new ValidationError(`Unknown quick action: ${action as string}`);
  }
}

export async function bulkQuickAction(
  action: QuickActionType,
  ids: string[],
  user: AuthenticatedUser,
  options: { zone?: string; actionId?: string } = {},
): Promise<{ total: number; succeeded: number; failed: number; results: QuickActionItemResult[] }> {
  assertBatchSize(ids.length);
  if (!QUICK_ACTION_TYPES.includes(action)) throw new ValidationError(`Unknown quick action: ${action as string}`);
  const updates = quickActionUpdates(action, options.zone);

  const results: QuickActionItemResult[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    let result: QuickActionItemResult;
    try {
      const updated = await updateSeedLot(ids[index], updates, user);
      result = { index, seedLotId: ids[index], status: 'succeeded', lotCode: updated.lot_code };
    } catch (err) {
      result = { index, seedLotId: ids[index], status: 'failed', error: errorMessage(err) };
    }
    results.push(result);
    broadcast('SEED_LOT_BATCH_PROGRESS', {
      actionId: options.actionId ?? null,
      action,
      total: ids.length,
      ...result,
    });
  }
  const failed = results.filter((r) => r.status === 'failed').length;
  return { total: results.length, succeeded: results.length - failed, failed, results };
}

export interface PrintLabelItemResult {
  index: number;
  seedLotId: string;
  status: 'succeeded' | 'failed';
  lotCode?: string;
  crop?: string;
  variety?: string;
  error?: string;
}

/**
 * "Print Labels" never mutates the lot — it's a read (to get the lot_code /
 * crop / variety a label needs) plus an audit-trail stamp (action:
 * 'PRINT_LABELS') so a batch print run is traceable the same way every other
 * batch operation is, per the prompt's "Log all batch operations in audit
 * trail". The actual label rendering (QR code + printable layout) happens
 * client-side, reusing the same `qrcode` library already used for lot
 * authenticity and packaging labels elsewhere in this app.
 */
export async function bulkPrintLabels(
  ids: string[],
  user: AuthenticatedUser,
  options: { actionId?: string } = {},
): Promise<{ total: number; succeeded: number; failed: number; results: PrintLabelItemResult[] }> {
  assertBatchSize(ids.length);

  const results: PrintLabelItemResult[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    let result: PrintLabelItemResult;
    try {
      const lot = await getSeedLotById(ids[index]);
      await withTransaction(async (client) => {
        await insertAuditLog(client, {
          entityType: 'seed_lot',
          entityId: lot.id,
          action: 'PRINT_LABELS',
          performedBy: user.email,
          metadata: { lotCode: lot.lot_code, printedAt: new Date().toISOString() },
        });
      });
      result = { index, seedLotId: ids[index], status: 'succeeded', lotCode: lot.lot_code, crop: lot.crop, variety: lot.variety };
    } catch (err) {
      result = { index, seedLotId: ids[index], status: 'failed', error: errorMessage(err) };
    }
    results.push(result);
    broadcast('SEED_LOT_BATCH_PROGRESS', {
      actionId: options.actionId ?? null,
      action: 'print_labels',
      total: ids.length,
      ...result,
    });
  }
  const failed = results.filter((r) => r.status === 'failed').length;
  return { total: results.length, succeeded: results.length - failed, failed, results };
}
