import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { insertNcrTx } from './ncr.service';
import {
  SEVERITIES,
  assertSeedLotExists,
  nextCode,
  optionalDate,
  optionalEmail,
  optionalText,
  requireEnum,
  requireText,
} from './quality.common';
import type { ComplaintRow, LotHoldRow, NonConformanceRow } from './quality.types';

const SOURCES = ['farmer', 'dealer', 'distributor', 'internal', 'other'] as const;

/**
 * Complaint intake. A major or critical complaint automatically raises a
 * linked non-conformance (so it enters the same investigate → CAPA → verify
 * pipeline as every other quality failure rather than living in a separate
 * inbox). A critical complaint about a specific lot also places that lot on
 * hold — containment happens at intake, not after the meeting.
 */
export async function createComplaint(input: Record<string, unknown>, user: AuthenticatedUser) {
  const source = requireEnum(input.source, SOURCES, 'source');
  const complainantName = requireText(input.complainantName, 'complainantName', 150);
  const complainantContact = optionalText(input.complainantContact, 'complainantContact', 150);
  const title = requireText(input.title, 'title', 200);
  const description = requireText(input.description, 'description', 5000);
  const severity = requireEnum(input.severity, SEVERITIES, 'severity');
  const seedLotId = optionalText(input.seedLotId, 'seedLotId', 64);
  const assignedTo = optionalEmail(input.assignedTo, 'assignedTo');
  const receivedDate = optionalDate(input.receivedDate, 'receivedDate') ?? new Date().toISOString().slice(0, 10);
  if (receivedDate > new Date().toISOString().slice(0, 10)) {
    throw new ValidationError('receivedDate cannot be in the future');
  }

  return withTransaction(async (client) => {
    if (seedLotId) await assertSeedLotExists(client, seedLotId);

    const code = await nextCode(client, 'CMP', 4, true);
    const inserted = await client.query<ComplaintRow>(
      `INSERT INTO quality_complaints
         (complaint_code, source, complainant_name, complainant_contact, seed_lot_id, title, description, severity, received_date, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [code, source, complainantName, complainantContact, seedLotId, title, description, severity, receivedDate, assignedTo, user.email],
    );
    let complaint = inserted.rows[0];
    await insertAuditLog(client, {
      entityType: 'quality_complaint',
      entityId: complaint.id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: complaint,
    });

    let ncr: NonConformanceRow | null = null;
    let hold: LotHoldRow | null = null;

    if (severity !== 'minor') {
      const raised = await insertNcrTx(
        client,
        {
          title: `${complaint.complaint_code}: ${title}`,
          description: `Raised automatically from customer complaint ${complaint.complaint_code} (${source}: ${complainantName}).\n\n${description}`,
          department: 'quality',
          source: 'complaint',
          severity,
          seedLotId,
          assignedTo,
          dueDate: null,
          complaintId: complaint.id,
        },
        user,
      );
      ncr = raised.ncr;
      const linked = await client.query<ComplaintRow>('UPDATE quality_complaints SET ncr_id = $2 WHERE id = $1 RETURNING *', [
        complaint.id,
        ncr.id,
      ]);
      complaint = linked.rows[0];

      if (severity === 'critical' && seedLotId) {
        // insertNcrTx already placed a hold citing the NCR; fetch it so the
        // caller can show the outcome.
        const active = await client.query<LotHoldRow>(
          'SELECT * FROM quality_lot_holds WHERE seed_lot_id = $1 AND released_at IS NULL',
          [seedLotId],
        );
        hold = active.rows[0] ?? null;
      }
    }

    return { complaint, ncr, hold };
  });
}

export async function listComplaints(filters: { status?: string; severity?: string; seedLotId?: string }) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (filters.status) add('c.status = ?', filters.status);
  if (filters.severity) add('c.severity = ?', filters.severity);
  if (filters.seedLotId) add('c.seed_lot_id = ?', filters.seedLotId);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT c.*, l.lot_code, n.ncr_code,
            GREATEST(0, (COALESCE(c.resolved_at::date, CURRENT_DATE) - c.received_date))::int AS age_days
       FROM quality_complaints c
       LEFT JOIN seed_lots l ON l.id = c.seed_lot_id
       LEFT JOIN non_conformances n ON n.id = c.ncr_id
       ${where}
      ORDER BY (c.status IN ('resolved','closed')), CASE c.severity WHEN 'critical' THEN 0 WHEN 'major' THEN 1 ELSE 2 END, c.received_date DESC
      LIMIT 500`,
    values,
  );
  return result.rows;
}

export async function getComplaint(id: string) {
  const result = await pool.query(
    `SELECT c.*, l.lot_code, l.crop, l.variety FROM quality_complaints c
       LEFT JOIN seed_lots l ON l.id = c.seed_lot_id WHERE c.id = $1`,
    [id],
  );
  const complaint = result.rows[0];
  if (!complaint) throw new NotFoundError(`Complaint ${id} not found`);
  const [ncr, capas] = await Promise.all([
    complaint.ncr_id
      ? pool.query('SELECT id, ncr_code, title, severity, status FROM non_conformances WHERE id = $1', [complaint.ncr_id])
      : Promise.resolve({ rows: [] }),
    pool.query('SELECT * FROM capas WHERE complaint_id = $1 ORDER BY created_at', [id]),
  ]);
  return { ...complaint, ncr: ncr.rows[0] ?? null, capas: capas.rows };
}

async function lockComplaint(client: PoolClient, id: string): Promise<ComplaintRow> {
  const result = await client.query<ComplaintRow>('SELECT * FROM quality_complaints WHERE id = $1 FOR UPDATE', [id]);
  if (!result.rows[0]) throw new NotFoundError(`Complaint ${id} not found`);
  return result.rows[0];
}

async function audit(client: PoolClient, before: ComplaintRow, after: ComplaintRow, action: string, user: AuthenticatedUser) {
  await insertAuditLog(client, {
    entityType: 'quality_complaint',
    entityId: before.id,
    action,
    performedBy: user.email,
    beforeState: before,
    afterState: after,
  });
}

export async function investigateComplaint(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    const before = await lockComplaint(client, id);
    if (before.status !== 'received') {
      throw new ConflictError(`${before.complaint_code} is ${before.status}; only received complaints can move to investigation`);
    }
    const assignedTo = input.assignedTo !== undefined ? optionalEmail(input.assignedTo, 'assignedTo') : before.assigned_to;
    const recall = input.recallRecommended === true ? true : before.recall_recommended;
    const updated = await client.query<ComplaintRow>(
      `UPDATE quality_complaints SET status = 'investigating', assigned_to = $2, recall_recommended = $3 WHERE id = $1 RETURNING *`,
      [id, assignedTo, recall],
    );
    await audit(client, before, updated.rows[0], 'INVESTIGATE', user);
    return updated.rows[0];
  });
}

export async function resolveComplaint(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const rootCause = requireText(input.rootCause, 'rootCause', 3000);
  const resolution = requireText(input.resolution, 'resolution', 3000);
  return withTransaction(async (client) => {
    const before = await lockComplaint(client, id);
    if (!['received', 'investigating'].includes(before.status)) {
      throw new ConflictError(`${before.complaint_code} is already ${before.status}`);
    }
    const recall = input.recallRecommended === true ? true : before.recall_recommended;
    const updated = await client.query<ComplaintRow>(
      `UPDATE quality_complaints
          SET status = 'resolved', root_cause = $2, resolution = $3, recall_recommended = $4, resolved_at = now()
        WHERE id = $1 RETURNING *`,
      [id, rootCause, resolution, recall],
    );
    await audit(client, before, updated.rows[0], 'RESOLVE', user);
    return updated.rows[0];
  });
}

/**
 * Closing a complaint requires that whatever it triggered is also finished:
 * the linked NCR must be closed/cancelled and its own CAPAs closed/cancelled.
 * Otherwise the customer is told "closed" while the cause is still open.
 */
export async function closeComplaint(id: string, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    const before = await lockComplaint(client, id);
    if (before.status !== 'resolved') {
      throw new ConflictError(`${before.complaint_code} must be resolved before it can be closed (currently ${before.status})`);
    }
    if (before.ncr_id) {
      const ncr = await client.query<{ status: string; ncr_code: string }>(
        'SELECT status, ncr_code FROM non_conformances WHERE id = $1',
        [before.ncr_id],
      );
      if (ncr.rows[0] && !['closed', 'cancelled'].includes(ncr.rows[0].status)) {
        throw new ConflictError(`Close ${ncr.rows[0].ncr_code} (raised from this complaint) before closing the complaint`);
      }
    }
    const openCapas = await client.query(
      `SELECT capa_code FROM capas WHERE complaint_id = $1 AND status IN ('open','in_progress','implemented')`,
      [id],
    );
    if (openCapas.rowCount) {
      throw new ConflictError(
        `Complaint still has open CAPA(s): ${openCapas.rows.map((r: { capa_code: string }) => r.capa_code).join(', ')}`,
      );
    }
    const updated = await client.query<ComplaintRow>(
      `UPDATE quality_complaints SET status = 'closed', closed_at = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    await audit(client, before, updated.rows[0], 'CLOSE', user);
    return updated.rows[0];
  });
}
