import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { DEPARTMENTS, nextCode, requireEmail, requireEnum, requireText, type Department } from './quality.common';
import type { SopDocumentRow, SopVersionRow } from './quality.types';

const DEPARTMENT_PREFIX: Record<Department, string> = {
  procurement: 'PRC',
  production: 'PRD',
  rd: 'RND',
  laboratory: 'LAB',
  warehouse: 'WHS',
  logistics: 'LOG',
  operations: 'OPS',
  quality: 'QMS',
  hr_training: 'HRT',
};

function reviewInterval(value: unknown): number {
  if (value === undefined || value === null || value === '') return 12;
  const months = Number(value);
  if (!Number.isInteger(months) || months < 1 || months > 60) {
    throw new ValidationError('reviewIntervalMonths must be a whole number between 1 and 60');
  }
  return months;
}

export async function createSop(input: Record<string, unknown>, user: AuthenticatedUser) {
  const title = requireText(input.title, 'title', 200);
  const department = requireEnum(input.department, DEPARTMENTS, 'department');
  const ownerEmail = requireEmail(input.ownerEmail, 'ownerEmail');
  const content = requireText(input.content, 'content', 100_000);
  const changeSummary = typeof input.changeSummary === 'string' && input.changeSummary.trim() ? input.changeSummary.trim() : 'Initial issue';
  const interval = reviewInterval(input.reviewIntervalMonths);

  return withTransaction(async (client) => {
    const code = await nextCode(client, `SOP-${DEPARTMENT_PREFIX[department]}`, 3, false);
    const doc = await client.query<SopDocumentRow>(
      `INSERT INTO sop_documents (sop_code, title, department, owner_email, review_interval_months, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [code, title, department, ownerEmail, interval, user.email],
    );
    const version = await client.query<SopVersionRow>(
      `INSERT INTO sop_versions (sop_id, version_number, title, content, change_summary, created_by)
       VALUES ($1, 1, $2, $3, $4, $5) RETURNING *`,
      [doc.rows[0].id, title, content, changeSummary, user.email],
    );
    await insertAuditLog(client, {
      entityType: 'sop_document',
      entityId: doc.rows[0].id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: { document: doc.rows[0], version: version.rows[0].version_number },
    });
    return { document: doc.rows[0], version: version.rows[0] };
  });
}

export async function listSops(filters: { department?: string; reviewStatus?: string }) {
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (filters.department) {
    values.push(filters.department);
    conditions.push(`d.department = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT d.*,
            eff.version_number AS effective_version,
            eff.effective_date,
            eff.next_review_date,
            eff.approved_by,
            open_v.version_number AS open_version,
            open_v.status AS open_version_status,
            CASE
              WHEN eff.id IS NULL THEN 'not_effective'
              WHEN eff.next_review_date < CURRENT_DATE THEN 'overdue'
              WHEN eff.next_review_date <= CURRENT_DATE + 30 THEN 'due_soon'
              ELSE 'current'
            END AS review_status,
            COALESCE((SELECT COUNT(*) FROM sop_acknowledgements a WHERE a.sop_version_id = eff.id), 0)::int AS acknowledgement_count
       FROM sop_documents d
       LEFT JOIN sop_versions eff ON eff.sop_id = d.id AND eff.status = 'effective'
       LEFT JOIN sop_versions open_v ON open_v.sop_id = d.id AND open_v.status IN ('draft', 'in_review')
       ${where}
      ORDER BY d.department, d.sop_code`,
    values,
  );
  return filters.reviewStatus ? result.rows.filter((r) => r.review_status === filters.reviewStatus) : result.rows;
}

export async function getSop(id: string, user: AuthenticatedUser) {
  const docResult = await pool.query<SopDocumentRow>('SELECT * FROM sop_documents WHERE id = $1', [id]);
  if (!docResult.rows[0]) throw new NotFoundError(`SOP ${id} not found`);
  const [versions, acks] = await Promise.all([
    pool.query<SopVersionRow>('SELECT * FROM sop_versions WHERE sop_id = $1 ORDER BY version_number DESC', [id]),
    pool.query<{ sop_version_id: string; user_email: string; acknowledged_at: string }>(
      `SELECT a.sop_version_id, a.user_email, a.acknowledged_at
         FROM sop_acknowledgements a JOIN sop_versions v ON v.id = a.sop_version_id WHERE v.sop_id = $1
        ORDER BY a.acknowledged_at DESC`,
      [id],
    ),
  ]);
  const effective = versions.rows.find((v) => v.status === 'effective') ?? null;
  return {
    document: docResult.rows[0],
    versions: versions.rows.map((v) => ({
      ...v,
      acknowledgement_count: acks.rows.filter((a) => a.sop_version_id === v.id).length,
    })),
    acknowledgements: acks.rows.filter((a) => effective && a.sop_version_id === effective.id),
    acknowledgedByMe: effective ? acks.rows.some((a) => a.sop_version_id === effective.id && a.user_email === user.email) : false,
  };
}

/** Effective SOPs the signed-in user has not yet read and acknowledged. */
export async function listPendingAcknowledgements(user: AuthenticatedUser) {
  const result = await pool.query(
    `SELECT d.id, d.sop_code, d.title, d.department, v.version_number, v.effective_date
       FROM sop_documents d
       JOIN sop_versions v ON v.sop_id = d.id AND v.status = 'effective'
      WHERE NOT EXISTS (SELECT 1 FROM sop_acknowledgements a WHERE a.sop_version_id = v.id AND a.user_email = $1)
      ORDER BY v.effective_date DESC, d.sop_code`,
    [user.email],
  );
  return result.rows;
}

async function lockDoc(client: PoolClient, id: string): Promise<SopDocumentRow> {
  const result = await client.query<SopDocumentRow>('SELECT * FROM sop_documents WHERE id = $1 FOR UPDATE', [id]);
  if (!result.rows[0]) throw new NotFoundError(`SOP ${id} not found`);
  return result.rows[0];
}

async function openVersion(client: PoolClient, sopId: string): Promise<SopVersionRow | null> {
  const result = await client.query<SopVersionRow>(
    `SELECT * FROM sop_versions WHERE sop_id = $1 AND status IN ('draft', 'in_review')`,
    [sopId],
  );
  return result.rows[0] ?? null;
}

/** Start a new revision. The effective version stays in force until the revision is approved. */
export async function reviseSop(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const content = requireText(input.content, 'content', 100_000);
  const changeSummary = requireText(input.changeSummary, 'changeSummary', 500);
  return withTransaction(async (client) => {
    const doc = await lockDoc(client, id);
    if (await openVersion(client, id)) {
      throw new ConflictError(`${doc.sop_code} already has a revision in progress — finish or reject it first`);
    }
    const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim() : doc.title;
    const next = await client.query<{ next: number }>(
      'SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM sop_versions WHERE sop_id = $1',
      [id],
    );
    const inserted = await client.query<SopVersionRow>(
      `INSERT INTO sop_versions (sop_id, version_number, title, content, change_summary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, next.rows[0].next, title, content, changeSummary, user.email],
    );
    await insertAuditLog(client, {
      entityType: 'sop_document',
      entityId: id,
      action: 'REVISE',
      performedBy: user.email,
      afterState: inserted.rows[0],
    });
    return inserted.rows[0];
  });
}

export async function updateDraft(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    await lockDoc(client, id);
    const draft = await openVersion(client, id);
    if (!draft) throw new NotFoundError('This SOP has no draft to edit');
    if (draft.status !== 'draft') throw new ConflictError('Only a draft can be edited — this version is already in review');
    const title = input.title !== undefined ? requireText(input.title, 'title', 200) : draft.title;
    const content = input.content !== undefined ? requireText(input.content, 'content', 100_000) : draft.content;
    const changeSummary = input.changeSummary !== undefined ? requireText(input.changeSummary, 'changeSummary', 500) : draft.change_summary;
    const updated = await client.query<SopVersionRow>(
      'UPDATE sop_versions SET title = $2, content = $3, change_summary = $4 WHERE id = $1 RETURNING *',
      [draft.id, title, content, changeSummary],
    );
    await insertAuditLog(client, {
      entityType: 'sop_document',
      entityId: id,
      action: 'UPDATE_DRAFT',
      performedBy: user.email,
      beforeState: draft,
      afterState: updated.rows[0],
    });
    return updated.rows[0];
  });
}

export async function submitForReview(id: string, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    await lockDoc(client, id);
    const draft = await openVersion(client, id);
    if (!draft || draft.status !== 'draft') throw new ConflictError('There is no draft to submit for review');
    const updated = await client.query<SopVersionRow>(
      `UPDATE sop_versions SET status = 'in_review', submitted_at = now() WHERE id = $1 RETURNING *`,
      [draft.id],
    );
    await insertAuditLog(client, {
      entityType: 'sop_document',
      entityId: id,
      action: 'SUBMIT_FOR_REVIEW',
      performedBy: user.email,
      beforeState: draft,
      afterState: updated.rows[0],
    });
    return updated.rows[0];
  });
}

/**
 * Approval makes a version effective and supersedes the previous one in one
 * transaction, so there is never a moment with two (or zero) effective
 * versions. Author cannot approve their own SOP.
 */
export async function approveSop(id: string, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    const doc = await lockDoc(client, id);
    const pending = await openVersion(client, id);
    if (!pending || pending.status !== 'in_review') throw new ConflictError('No version is awaiting approval');
    if (pending.created_by === user.email) {
      throw new ForbiddenError('The author of a SOP version cannot approve it — another approver must sign off');
    }
    await client.query(
      `UPDATE sop_versions SET status = 'superseded', retired_at = now() WHERE sop_id = $1 AND status = 'effective'`,
      [id],
    );
    const updated = await client.query<SopVersionRow>(
      `UPDATE sop_versions
          SET status = 'effective', approved_by = $2, approved_at = now(), effective_date = CURRENT_DATE,
              next_review_date = (CURRENT_DATE + make_interval(months => $3))::date
        WHERE id = $1 RETURNING *`,
      [pending.id, user.email, doc.review_interval_months],
    );
    // Keep the register's headline title in step with the version in force.
    await client.query('UPDATE sop_documents SET title = $2 WHERE id = $1', [id, updated.rows[0].title]);
    await insertAuditLog(client, {
      entityType: 'sop_document',
      entityId: id,
      action: 'APPROVE',
      performedBy: user.email,
      beforeState: pending,
      afterState: updated.rows[0],
    });
    return updated.rows[0];
  });
}

export async function rejectSop(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const reason = requireText(input.reason, 'reason', 1000);
  return withTransaction(async (client) => {
    await lockDoc(client, id);
    const pending = await openVersion(client, id);
    if (!pending || pending.status !== 'in_review') throw new ConflictError('No version is awaiting approval');
    const updated = await client.query<SopVersionRow>(
      `UPDATE sop_versions SET status = 'rejected', rejection_reason = $2 WHERE id = $1 RETURNING *`,
      [pending.id, reason],
    );
    await insertAuditLog(client, {
      entityType: 'sop_document',
      entityId: id,
      action: 'REJECT',
      performedBy: user.email,
      beforeState: pending,
      afterState: updated.rows[0],
      metadata: { reason },
    });
    return updated.rows[0];
  });
}

/** Withdraw the effective version without a replacement (process discontinued). */
export async function retireSop(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const reason = requireText(input.reason, 'reason', 1000);
  return withTransaction(async (client) => {
    await lockDoc(client, id);
    const result = await client.query<SopVersionRow>(
      `UPDATE sop_versions SET status = 'superseded', retired_at = now() WHERE sop_id = $1 AND status = 'effective' RETURNING *`,
      [id],
    );
    if (!result.rows[0]) throw new ConflictError('This SOP has no effective version to retire');
    await insertAuditLog(client, {
      entityType: 'sop_document',
      entityId: id,
      action: 'RETIRE',
      performedBy: user.email,
      afterState: result.rows[0],
      metadata: { reason },
    });
    return result.rows[0];
  });
}

export async function acknowledgeSop(id: string, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    await lockDoc(client, id);
    const eff = await client.query<SopVersionRow>(`SELECT * FROM sop_versions WHERE sop_id = $1 AND status = 'effective'`, [id]);
    if (!eff.rows[0]) throw new ConflictError('This SOP has no effective version to acknowledge');
    const inserted = await client.query(
      `INSERT INTO sop_acknowledgements (sop_version_id, user_email) VALUES ($1, $2)
       ON CONFLICT (sop_version_id, user_email) DO NOTHING RETURNING id`,
      [eff.rows[0].id, user.email],
    );
    if (inserted.rowCount) {
      await insertAuditLog(client, {
        entityType: 'sop_document',
        entityId: id,
        action: 'ACKNOWLEDGE',
        performedBy: user.email,
        metadata: { versionNumber: eff.rows[0].version_number },
      });
    }
    return { sopId: id, versionNumber: eff.rows[0].version_number, alreadyAcknowledged: !inserted.rowCount };
  });
}
