import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { nextCode, optionalText, requireDate, requireEmail, requireEnum, requireText } from './quality.common';
import type { CapaRow } from './quality.types';

const ACTION_TYPES = ['corrective', 'preventive'] as const;
const RESULTS = ['effective', 'ineffective'] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createCapa(input: Record<string, unknown>, user: AuthenticatedUser): Promise<CapaRow> {
  const actionType = requireEnum(input.actionType, ACTION_TYPES, 'actionType');
  const title = requireText(input.title, 'title', 200);
  const description = requireText(input.description, 'description', 5000);
  const ownerEmail = requireEmail(input.ownerEmail, 'ownerEmail');
  const dueDate = requireDate(input.dueDate, 'dueDate');
  if (dueDate < todayIso()) throw new ValidationError('dueDate cannot be in the past');
  const ncrId = optionalText(input.ncrId, 'ncrId', 64);
  const complaintId = optionalText(input.complaintId, 'complaintId', 64);

  return withTransaction(async (client) => {
    if (ncrId) {
      const ncr = await client.query<{ id: string; status: string; ncr_code: string }>(
        'SELECT id, status, ncr_code FROM non_conformances WHERE id = $1 FOR UPDATE',
        [ncrId],
      );
      if (!ncr.rows[0]) throw new NotFoundError(`Non-conformance ${ncrId} not found`);
      if (['closed', 'cancelled'].includes(ncr.rows[0].status)) {
        throw new ConflictError(`${ncr.rows[0].ncr_code} is ${ncr.rows[0].status} — raise a new NCR instead of adding actions to it`);
      }
      // Committing to an action means the NCR is being worked.
      if (ncr.rows[0].status === 'open') {
        await client.query(`UPDATE non_conformances SET status = 'investigating' WHERE id = $1`, [ncrId]);
      }
    }
    if (complaintId) {
      const complaint = await client.query<{ status: string; complaint_code: string }>(
        'SELECT status, complaint_code FROM quality_complaints WHERE id = $1',
        [complaintId],
      );
      if (!complaint.rows[0]) throw new NotFoundError(`Complaint ${complaintId} not found`);
      if (complaint.rows[0].status === 'closed') {
        throw new ConflictError(`${complaint.rows[0].complaint_code} is closed`);
      }
    }

    const code = await nextCode(client, 'CAPA', 4, true);
    const inserted = await client.query<CapaRow>(
      `INSERT INTO capas (capa_code, ncr_id, complaint_id, action_type, title, description, owner_email, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [code, ncrId, complaintId, actionType, title, description, ownerEmail, dueDate, user.email],
    );
    await insertAuditLog(client, {
      entityType: 'capa',
      entityId: inserted.rows[0].id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: inserted.rows[0],
    });
    return inserted.rows[0];
  });
}

export interface CapaFilters {
  status?: string;
  ncrId?: string;
  complaintId?: string;
  owner?: string;
  overdue?: boolean;
}

export async function listCapas(filters: CapaFilters) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (filters.status) add('c.status = ?', filters.status);
  if (filters.ncrId) add('c.ncr_id = ?', filters.ncrId);
  if (filters.complaintId) add('c.complaint_id = ?', filters.complaintId);
  if (filters.owner) add('c.owner_email = ?', filters.owner.toLowerCase());
  if (filters.overdue) conditions.push(`c.status IN ('open','in_progress','implemented') AND c.due_date < CURRENT_DATE`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT c.*, n.ncr_code, cm.complaint_code,
            (c.status IN ('open','in_progress','implemented') AND c.due_date < CURRENT_DATE) AS is_overdue
       FROM capas c
       LEFT JOIN non_conformances n ON n.id = c.ncr_id
       LEFT JOIN quality_complaints cm ON cm.id = c.complaint_id
       ${where}
      ORDER BY c.due_date ASC, c.created_at DESC
      LIMIT 500`,
    values,
  );
  return result.rows;
}

export async function getCapa(id: string) {
  const result = await pool.query(
    `SELECT c.*, n.ncr_code, n.title AS ncr_title, cm.complaint_code,
            (c.status IN ('open','in_progress','implemented') AND c.due_date < CURRENT_DATE) AS is_overdue
       FROM capas c
       LEFT JOIN non_conformances n ON n.id = c.ncr_id
       LEFT JOIN quality_complaints cm ON cm.id = c.complaint_id
      WHERE c.id = $1`,
    [id],
  );
  if (!result.rows[0]) throw new NotFoundError(`CAPA ${id} not found`);
  return result.rows[0];
}

async function lockCapa(client: PoolClient, id: string): Promise<CapaRow> {
  const result = await client.query<CapaRow>('SELECT * FROM capas WHERE id = $1 FOR UPDATE', [id]);
  if (!result.rows[0]) throw new NotFoundError(`CAPA ${id} not found`);
  return result.rows[0];
}

async function saveTransition(
  client: PoolClient,
  before: CapaRow,
  after: CapaRow,
  action: string,
  user: AuthenticatedUser,
  metadata?: unknown,
): Promise<CapaRow> {
  await insertAuditLog(client, {
    entityType: 'capa',
    entityId: before.id,
    action,
    performedBy: user.email,
    beforeState: before,
    afterState: after,
    metadata,
  });
  return after;
}

// The owner does the work; Admin can act for them (leave, resignation). Other
// users — including Inspectors — cannot mark someone else's action done.
function assertCanWork(capa: CapaRow, user: AuthenticatedUser): void {
  if (user.email.toLowerCase() !== capa.owner_email && user.role !== 'Admin') {
    throw new ForbiddenError(`Only the CAPA owner (${capa.owner_email}) or an Admin can update this action`);
  }
}

export async function startCapa(id: string, user: AuthenticatedUser): Promise<CapaRow> {
  return withTransaction(async (client) => {
    const before = await lockCapa(client, id);
    assertCanWork(before, user);
    if (before.status !== 'open') throw new ConflictError(`CAPA ${before.capa_code} is ${before.status}, not open`);
    const updated = await client.query<CapaRow>(`UPDATE capas SET status = 'in_progress' WHERE id = $1 RETURNING *`, [id]);
    return saveTransition(client, before, updated.rows[0], 'START', user);
  });
}

export async function implementCapa(id: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<CapaRow> {
  const notes = requireText(input.implementationNotes, 'implementationNotes', 3000);
  return withTransaction(async (client) => {
    const before = await lockCapa(client, id);
    assertCanWork(before, user);
    if (!['open', 'in_progress'].includes(before.status)) {
      throw new ConflictError(`CAPA ${before.capa_code} is ${before.status} and cannot be marked implemented`);
    }
    const updated = await client.query<CapaRow>(
      `UPDATE capas SET status = 'implemented', implementation_notes = $2, implemented_at = now() WHERE id = $1 RETURNING *`,
      [id, notes],
    );
    return saveTransition(client, before, updated.rows[0], 'IMPLEMENT', user);
  });
}

/**
 * Effectiveness verification. Separation of duties: the person who did the
 * work cannot sign off that it worked. 'ineffective' returns the CAPA to
 * in_progress so the NCR stays open until an action actually holds.
 */
export async function verifyCapa(id: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<CapaRow> {
  const result = requireEnum(input.result, RESULTS, 'result');
  const notes = requireText(input.effectivenessNotes, 'effectivenessNotes', 3000);
  return withTransaction(async (client) => {
    const before = await lockCapa(client, id);
    if (before.status !== 'implemented') {
      throw new ConflictError(`Only implemented CAPAs can be verified (${before.capa_code} is ${before.status})`);
    }
    if (user.email.toLowerCase() === before.owner_email) {
      throw new ForbiddenError('The CAPA owner cannot verify their own action — another Admin must verify effectiveness');
    }
    const nextStatus = result === 'effective' ? 'closed' : 'in_progress';
    const updated = await client.query<CapaRow>(
      `UPDATE capas
          SET status = $2, effectiveness_result = $3, effectiveness_notes = $4,
              verified_by = $5, verified_at = now(), verification_count = verification_count + 1
        WHERE id = $1 RETURNING *`,
      [id, nextStatus, result, notes, user.email],
    );
    return saveTransition(client, before, updated.rows[0], result === 'effective' ? 'VERIFY_EFFECTIVE' : 'VERIFY_INEFFECTIVE', user);
  });
}

export async function cancelCapa(id: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<CapaRow> {
  const reason = requireText(input.reason, 'reason', 1000);
  return withTransaction(async (client) => {
    const before = await lockCapa(client, id);
    if (['closed', 'cancelled'].includes(before.status)) {
      throw new ConflictError(`CAPA ${before.capa_code} is already ${before.status}`);
    }
    const updated = await client.query<CapaRow>(
      `UPDATE capas SET status = 'cancelled', implementation_notes = COALESCE(implementation_notes || E'\\n', '') || $2 WHERE id = $1 RETURNING *`,
      [id, `Cancelled: ${reason}`],
    );
    return saveTransition(client, before, updated.rows[0], 'CANCEL', user, { reason });
  });
}
