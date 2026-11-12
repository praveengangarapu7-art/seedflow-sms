import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { placeHoldTx } from './holds.service';
import {
  DEPARTMENTS,
  SEVERITIES,
  assertSeedLotExists,
  nextCode,
  optionalDate,
  optionalEmail,
  optionalText,
  requireEnum,
  requireText,
} from './quality.common';
import type { CapaRow, NonConformanceRow } from './quality.types';

export const NCR_SOURCES = ['internal_audit', 'complaint', 'inspection', 'lab_oos', 'supplier', 'process_deviation', 'other'] as const;

// Target days to close, by severity. Applied only when the raiser doesn't set
// a due date — a non-conformance with no due date is one nobody chases.
const DEFAULT_DUE_DAYS: Record<string, number> = { critical: 7, major: 30, minor: 60 };

function defaultDueDate(severity: string): string {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + DEFAULT_DUE_DAYS[severity]);
  return due.toISOString().slice(0, 10);
}

export interface NcrInsertInput {
  title: string;
  description: string;
  department: (typeof DEPARTMENTS)[number];
  source: (typeof NCR_SOURCES)[number];
  severity: (typeof SEVERITIES)[number];
  seedLotId: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  complaintId?: string | null;
}

export function parseNcrInput(input: Record<string, unknown>): NcrInsertInput {
  return {
    title: requireText(input.title, 'title', 200),
    description: requireText(input.description, 'description', 5000),
    department: requireEnum(input.department, DEPARTMENTS, 'department'),
    source: requireEnum(input.source, NCR_SOURCES, 'source'),
    severity: requireEnum(input.severity, SEVERITIES, 'severity'),
    seedLotId: optionalText(input.seedLotId, 'seedLotId', 64),
    assignedTo: optionalEmail(input.assignedTo, 'assignedTo'),
    dueDate: optionalDate(input.dueDate, 'dueDate'),
  };
}

/**
 * Inserts an NCR inside the caller's transaction (also used by complaint
 * intake to auto-raise one). A critical NCR against a lot places that lot on
 * quality hold immediately: containment first, investigation second.
 */
export async function insertNcrTx(
  client: PoolClient,
  input: NcrInsertInput,
  user: AuthenticatedUser,
): Promise<{ ncr: NonConformanceRow; holdPlaced: boolean }> {
  if (input.seedLotId) await assertSeedLotExists(client, input.seedLotId);

  const code = await nextCode(client, 'NCR', 4, true);
  const inserted = await client.query<NonConformanceRow>(
    `INSERT INTO non_conformances
       (ncr_code, title, description, department, source, severity, seed_lot_id, raised_by, assigned_to, due_date, complaint_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      code,
      input.title,
      input.description,
      input.department,
      input.source,
      input.severity,
      input.seedLotId,
      user.email,
      input.assignedTo,
      input.dueDate ?? defaultDueDate(input.severity),
      input.complaintId ?? null,
    ],
  );
  const ncr = inserted.rows[0];
  await insertAuditLog(client, {
    entityType: 'non_conformance',
    entityId: ncr.id,
    action: 'CREATE',
    performedBy: user.email,
    afterState: ncr,
  });

  let holdPlaced = false;
  if (input.severity === 'critical' && input.seedLotId) {
    const hold = await placeHoldTx(
      client,
      { seedLotId: input.seedLotId, reason: `Critical non-conformance ${ncr.ncr_code}: ${ncr.title}`, sourceType: 'ncr', sourceId: ncr.id },
      user,
      true,
    );
    holdPlaced = hold.source_id === ncr.id;
  }
  return { ncr, holdPlaced };
}

export async function createNcr(input: Record<string, unknown>, user: AuthenticatedUser) {
  const parsed = parseNcrInput(input);
  return withTransaction((client) => insertNcrTx(client, parsed, user));
}

export interface NcrFilters {
  status?: string;
  severity?: string;
  department?: string;
  seedLotId?: string;
  overdue?: boolean;
}

export async function listNcrs(filters: NcrFilters) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (filters.status) add('n.status = ?', filters.status);
  if (filters.severity) add('n.severity = ?', filters.severity);
  if (filters.department) add('n.department = ?', filters.department);
  if (filters.seedLotId) add('n.seed_lot_id = ?', filters.seedLotId);
  if (filters.overdue) conditions.push(`n.status IN ('open','investigating') AND n.due_date < CURRENT_DATE`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT n.*, l.lot_code,
            (n.status IN ('open','investigating') AND n.due_date < CURRENT_DATE) AS is_overdue,
            COUNT(c.id) FILTER (WHERE c.status <> 'cancelled')::int AS capa_count,
            COUNT(c.id) FILTER (WHERE c.status IN ('open','in_progress','implemented'))::int AS open_capa_count
       FROM non_conformances n
       LEFT JOIN seed_lots l ON l.id = n.seed_lot_id
       LEFT JOIN capas c ON c.ncr_id = n.id
       ${where}
      GROUP BY n.id, l.lot_code
      ORDER BY CASE n.severity WHEN 'critical' THEN 0 WHEN 'major' THEN 1 ELSE 2 END, n.created_at DESC
      LIMIT 500`,
    values,
  );
  return result.rows;
}

export async function getNcr(id: string) {
  const ncrResult = await pool.query(
    `SELECT n.*, l.lot_code, (n.status IN ('open','investigating') AND n.due_date < CURRENT_DATE) AS is_overdue
       FROM non_conformances n LEFT JOIN seed_lots l ON l.id = n.seed_lot_id WHERE n.id = $1`,
    [id],
  );
  const ncr = ncrResult.rows[0];
  if (!ncr) throw new NotFoundError(`Non-conformance ${id} not found`);
  const [capas, complaint, holds] = await Promise.all([
    pool.query('SELECT * FROM capas WHERE ncr_id = $1 ORDER BY created_at', [id]),
    ncr.complaint_id
      ? pool.query('SELECT id, complaint_code, title, severity, status FROM quality_complaints WHERE id = $1', [ncr.complaint_id])
      : Promise.resolve({ rows: [] }),
    pool.query(`SELECT * FROM quality_lot_holds WHERE source_type = 'ncr' AND source_id = $1 ORDER BY placed_at DESC`, [id]),
  ]);
  return { ...ncr, capas: capas.rows, complaint: complaint.rows[0] ?? null, holds: holds.rows };
}

async function lockNcr(client: PoolClient, id: string): Promise<NonConformanceRow> {
  const result = await client.query<NonConformanceRow>('SELECT * FROM non_conformances WHERE id = $1 FOR UPDATE', [id]);
  if (!result.rows[0]) throw new NotFoundError(`Non-conformance ${id} not found`);
  return result.rows[0];
}

function assertNcrOpen(ncr: NonConformanceRow): void {
  if (ncr.status === 'closed' || ncr.status === 'cancelled') {
    throw new ConflictError(`${ncr.ncr_code} is ${ncr.status} and can no longer be changed`);
  }
}

/** Assign, set root cause / due date, and move an open NCR into investigation. */
export async function updateNcr(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    const before = await lockNcr(client, id);
    assertNcrOpen(before);

    const assignedTo = input.assignedTo !== undefined ? optionalEmail(input.assignedTo, 'assignedTo') : before.assigned_to;
    const dueDate = input.dueDate !== undefined ? optionalDate(input.dueDate, 'dueDate') : before.due_date;
    const rootCause = input.rootCause !== undefined ? optionalText(input.rootCause, 'rootCause') : before.root_cause;
    const startInvestigation = input.startInvestigation === true;
    const status = before.status === 'open' && (startInvestigation || rootCause) ? 'investigating' : before.status;

    const updated = await client.query<NonConformanceRow>(
      `UPDATE non_conformances SET assigned_to = $2, due_date = $3, root_cause = $4, status = $5 WHERE id = $1 RETURNING *`,
      [id, assignedTo, dueDate, rootCause, status],
    );
    await insertAuditLog(client, {
      entityType: 'non_conformance',
      entityId: id,
      action: 'UPDATE',
      performedBy: user.email,
      beforeState: before,
      afterState: updated.rows[0],
    });
    return updated.rows[0];
  });
}

/**
 * Closing is the gate the whole spine exists to enforce: a root cause must be
 * on record, every CAPA raised against the NCR must be closed (implemented
 * AND verified effective), and a major or critical NCR must have had at least
 * one CAPA — "we fixed it" with no corrective action is not closure.
 */
export async function closeNcr(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const closureNotes = requireText(input.closureNotes, 'closureNotes', 2000);
  return withTransaction(async (client) => {
    const before = await lockNcr(client, id);
    assertNcrOpen(before);

    const rootCause = input.rootCause !== undefined ? optionalText(input.rootCause, 'rootCause') : before.root_cause;
    if (!rootCause) throw new ValidationError('A root cause must be recorded before an NCR can be closed');

    const capas = await client.query<CapaRow>('SELECT * FROM capas WHERE ncr_id = $1 AND status <> \'cancelled\'', [id]);
    const unfinished = capas.rows.filter((c) => c.status !== 'closed');
    if (unfinished.length > 0) {
      throw new ConflictError(
        `${before.ncr_code} still has ${unfinished.length} CAPA(s) that are not closed (${unfinished.map((c) => c.capa_code).join(', ')}) — each must be implemented and verified effective first`,
      );
    }
    if (before.severity !== 'minor' && capas.rows.length === 0) {
      throw new ConflictError(`${before.severity} non-conformances require at least one corrective or preventive action before closure`);
    }

    const updated = await client.query<NonConformanceRow>(
      `UPDATE non_conformances
          SET status = 'closed', root_cause = $2, closure_notes = $3, closed_by = $4, closed_at = now()
        WHERE id = $1 RETURNING *`,
      [id, rootCause, closureNotes, user.email],
    );
    await insertAuditLog(client, {
      entityType: 'non_conformance',
      entityId: id,
      action: 'CLOSE',
      performedBy: user.email,
      beforeState: before,
      afterState: updated.rows[0],
    });
    return updated.rows[0];
  });
}

export async function cancelNcr(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const reason = requireText(input.reason, 'reason', 1000);
  return withTransaction(async (client) => {
    const before = await lockNcr(client, id);
    assertNcrOpen(before);
    const active = await client.query(`SELECT 1 FROM capas WHERE ncr_id = $1 AND status IN ('open','in_progress','implemented')`, [id]);
    if (active.rowCount) {
      throw new ConflictError('Cancel or close the CAPAs raised against this NCR before cancelling it');
    }
    const updated = await client.query<NonConformanceRow>(
      `UPDATE non_conformances SET status = 'cancelled', closure_notes = $2 WHERE id = $1 RETURNING *`,
      [id, reason],
    );
    await insertAuditLog(client, {
      entityType: 'non_conformance',
      entityId: id,
      action: 'CANCEL',
      performedBy: user.email,
      beforeState: before,
      afterState: updated.rows[0],
      metadata: { reason },
    });
    return updated.rows[0];
  });
}
