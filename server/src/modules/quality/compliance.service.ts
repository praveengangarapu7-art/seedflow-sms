import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { SEED_COMPANY_STARTER } from './compliance.template';
import { insertNcrTx } from './ncr.service';
import {
  DEPARTMENTS,
  nextCode,
  optionalDate,
  optionalText,
  requireDate,
  requireEmail,
  requireEnum,
  requireText,
} from './quality.common';

export const REQ_CATEGORIES = [
  'licensing',
  'certification',
  'labelling_packaging',
  'record_keeping',
  'quality_testing',
  'storage_handling',
  'dealer_sales',
  'customer_export',
  'other',
] as const;
export const REQ_RISKS = ['low', 'medium', 'high', 'critical'] as const;
export const ASSESS_STATUSES = ['compliant', 'partially_compliant', 'non_compliant', 'not_applicable'] as const;

const RISK_TO_NCR_SEVERITY: Record<string, 'minor' | 'major' | 'critical'> = {
  low: 'minor',
  medium: 'minor',
  high: 'major',
  critical: 'critical',
};

interface RequirementRow {
  id: string;
  req_code: string;
  regulation: string;
  reference: string | null;
  title: string;
  description: string;
  category: string;
  department: string;
  status: string;
  current_status: string | null;
  gap: string | null;
  risk: string | null;
  corrective_action: string | null;
  responsible_email: string | null;
  target_date: string | null;
  sop_id: string | null;
  ncr_id: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
  next_review_date: string | null;
  created_by: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function addMonths(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

async function assertSopExists(client: PoolClient, sopId: string) {
  const r = await client.query('SELECT 1 FROM sop_documents WHERE id = $1', [sopId]);
  if (!r.rows[0]) throw new NotFoundError(`SOP ${sopId} not found`);
}

async function lockRequirement(client: PoolClient, id: string): Promise<RequirementRow> {
  const r = await client.query<RequirementRow>('SELECT * FROM compliance_requirements WHERE id = $1 FOR UPDATE', [id]);
  if (!r.rows[0]) throw new NotFoundError(`Compliance requirement ${id} not found`);
  return r.rows[0];
}

// ------------------------------------------------------------ definition

function parseDefinition(input: Record<string, unknown>) {
  return {
    regulation: requireText(input.regulation, 'regulation', 150),
    reference: optionalText(input.reference, 'reference', 100),
    title: requireText(input.title, 'title', 200),
    description: requireText(input.description, 'description', 5000),
    category: requireEnum(input.category, REQ_CATEGORIES, 'category'),
    department: requireEnum(input.department, DEPARTMENTS, 'department'),
    sopId: optionalText(input.sopId, 'sopId', 64),
  };
}

export async function createRequirement(input: Record<string, unknown>, user: AuthenticatedUser) {
  const p = parseDefinition(input);
  return withTransaction(async (client) => {
    if (p.sopId) await assertSopExists(client, p.sopId);
    const code = await nextCode(client, 'REQ', 3, false);
    const inserted = await client.query<RequirementRow>(
      `INSERT INTO compliance_requirements
         (req_code, regulation, reference, title, description, category, department, sop_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [code, p.regulation, p.reference, p.title, p.description, p.category, p.department, p.sopId, user.email],
    );
    await insertAuditLog(client, {
      entityType: 'compliance_requirement',
      entityId: inserted.rows[0].id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: inserted.rows[0],
    });
    return inserted.rows[0];
  });
}

export async function updateRequirement(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const p = parseDefinition(input);
  return withTransaction(async (client) => {
    const before = await lockRequirement(client, id);
    if (p.sopId) await assertSopExists(client, p.sopId);
    const updated = await client.query<RequirementRow>(
      `UPDATE compliance_requirements
          SET regulation=$2, reference=$3, title=$4, description=$5, category=$6, department=$7, sop_id=$8
        WHERE id=$1 RETURNING *`,
      [id, p.regulation, p.reference, p.title, p.description, p.category, p.department, p.sopId],
    );
    await insertAuditLog(client, {
      entityType: 'compliance_requirement',
      entityId: id,
      action: 'UPDATE',
      performedBy: user.email,
      beforeState: before,
      afterState: updated.rows[0],
    });
    return updated.rows[0];
  });
}

// ------------------------------------------------------------ queries

export interface RequirementFilters {
  status?: string;
  category?: string;
  department?: string;
  risk?: string;
  overdue?: boolean;
  q?: string;
}

const SELECT_LIST = `
  SELECT r.*,
         (SELECT COUNT(*)::int FROM compliance_evidence e WHERE e.requirement_id = r.id) AS evidence_count,
         (r.status IN ('partially_compliant','non_compliant') AND r.target_date < CURRENT_DATE) AS is_overdue,
         (r.next_review_date IS NOT NULL AND r.next_review_date < CURRENT_DATE) AS review_overdue,
         n.ncr_code, n.status AS ncr_status,
         s.sop_code
    FROM compliance_requirements r
    LEFT JOIN non_conformances n ON n.id = r.ncr_id
    LEFT JOIN sop_documents s ON s.id = r.sop_id`;

export async function listRequirements(filters: RequirementFilters) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (filters.status) add('r.status = ?', filters.status);
  if (filters.category) add('r.category = ?', filters.category);
  if (filters.department) add('r.department = ?', filters.department);
  if (filters.risk) add('r.risk = ?', filters.risk);
  if (filters.overdue) conditions.push(`r.status IN ('partially_compliant','non_compliant') AND r.target_date < CURRENT_DATE`);
  if (filters.q) {
    values.push(`%${filters.q.replace(/[%_\\]/g, '\\$&')}%`);
    conditions.push(`(r.title ILIKE $${values.length} OR r.regulation ILIKE $${values.length} OR r.req_code ILIKE $${values.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`${SELECT_LIST} ${where} ORDER BY r.req_code LIMIT 500`, values);
  return result.rows;
}

export async function getRequirement(id: string) {
  const found = await pool.query(`${SELECT_LIST} WHERE r.id = $1`, [id]);
  if (!found.rows[0]) throw new NotFoundError(`Compliance requirement ${id} not found`);
  const requirement = found.rows[0];
  const [evidence, capas] = await Promise.all([
    pool.query('SELECT * FROM compliance_evidence WHERE requirement_id = $1 ORDER BY added_at', [id]),
    requirement.ncr_id
      ? pool.query(
          'SELECT id, capa_code, title, action_type, status, owner_email, due_date FROM capas WHERE ncr_id = $1 ORDER BY created_at',
          [requirement.ncr_id],
        )
      : Promise.resolve({ rows: [] }),
  ]);
  return { requirement, evidence: evidence.rows, capas: capas.rows };
}

// ------------------------------------------------------------ assessment

/**
 * Records an assessment verdict. The rules that make the register worth
 * trusting live here:
 *  - "compliant" needs at least one piece of evidence;
 *  - "compliant" is refused while the NCR raised for the gap is still open;
 *  - a gap needs a risk, an owner and a future target date;
 *  - "not applicable" needs a written justification.
 */
export async function assessRequirement(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const status = requireEnum(input.status, ASSESS_STATUSES, 'status');
  const currentStatus = requireText(input.currentStatus, 'currentStatus', 5000);
  const nextReview = optionalDate(input.nextReviewDate, 'nextReviewDate');

  return withTransaction(async (client) => {
    const before = await lockRequirement(client, id);
    let gap: string | null = null;
    let risk: string | null = null;
    let action: string | null = null;
    let responsible: string | null = null;
    let target: string | null = null;

    if (status === 'partially_compliant' || status === 'non_compliant') {
      gap = requireText(input.gap, 'gap', 5000);
      risk = requireEnum(input.risk, REQ_RISKS, 'risk');
      action = optionalText(input.correctiveAction, 'correctiveAction', 5000);
      responsible = requireEmail(input.responsibleEmail, 'responsibleEmail');
      target = requireDate(input.targetDate, 'targetDate');
      if (target < todayIso()) throw new ValidationError('targetDate cannot be in the past');
    } else if (status === 'compliant') {
      const evidence = await client.query('SELECT 1 FROM compliance_evidence WHERE requirement_id = $1 LIMIT 1', [id]);
      if (!evidence.rows[0]) {
        throw new ConflictError('Attach at least one piece of evidence before marking this requirement compliant');
      }
      if (before.ncr_id) {
        const ncr = await client.query<{ ncr_code: string; status: string }>(
          'SELECT ncr_code, status FROM non_conformances WHERE id = $1',
          [before.ncr_id],
        );
        if (ncr.rows[0] && ['open', 'investigating'].includes(ncr.rows[0].status)) {
          throw new ConflictError(`Close ${ncr.rows[0].ncr_code} (raised for this gap) before marking the requirement compliant`);
        }
      }
    }

    const reviewDate = status === 'compliant' ? (nextReview ?? addMonths(12)) : nextReview;
    const updated = await client.query<RequirementRow>(
      `UPDATE compliance_requirements
          SET status=$2, current_status=$3, gap=$4, risk=$5, corrective_action=$6, responsible_email=$7,
              target_date=$8, next_review_date=$9, assessed_by=$10, assessed_at=now()
        WHERE id=$1 RETURNING *`,
      [id, status, currentStatus, gap, risk, action, responsible, target, reviewDate, user.email],
    );
    await insertAuditLog(client, {
      entityType: 'compliance_requirement',
      entityId: id,
      action: 'ASSESS',
      performedBy: user.email,
      beforeState: before,
      afterState: updated.rows[0],
    });
    return updated.rows[0];
  });
}

// ------------------------------------------------------------ evidence

export async function addEvidence(id: string, input: Record<string, unknown>, user: AuthenticatedUser) {
  const title = requireText(input.title, 'title', 200);
  const reference = optionalText(input.reference, 'reference', 500);
  const description = optionalText(input.description, 'description', 2000);
  if (!reference && !description) {
    throw new ValidationError('Evidence needs a reference (document, link or record number) or a description');
  }
  return withTransaction(async (client) => {
    await lockRequirement(client, id);
    const inserted = await client.query(
      `INSERT INTO compliance_evidence (requirement_id, title, reference, description, added_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, title, reference, description, user.email],
    );
    await insertAuditLog(client, {
      entityType: 'compliance_requirement',
      entityId: id,
      action: 'ADD_EVIDENCE',
      performedBy: user.email,
      afterState: inserted.rows[0],
    });
    return inserted.rows[0];
  });
}

export async function removeEvidence(id: string, evidenceId: string, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    const req = await lockRequirement(client, id);
    const count = await client.query<{ n: number }>(
      'SELECT COUNT(*)::int AS n FROM compliance_evidence WHERE requirement_id = $1',
      [id],
    );
    const target = await client.query('SELECT * FROM compliance_evidence WHERE id = $1 AND requirement_id = $2', [evidenceId, id]);
    if (!target.rows[0]) throw new NotFoundError('Evidence not found');
    if (req.status === 'compliant' && count.rows[0].n <= 1) {
      throw new ConflictError('This is the only evidence for a compliant requirement — re-assess the requirement before removing it');
    }
    await client.query('DELETE FROM compliance_evidence WHERE id = $1', [evidenceId]);
    await insertAuditLog(client, {
      entityType: 'compliance_requirement',
      entityId: id,
      action: 'REMOVE_EVIDENCE',
      performedBy: user.email,
      beforeState: target.rows[0],
    });
    return { removed: true };
  });
}

// ------------------------------------------------------------ gap -> NCR

/**
 * Turns an open gap into a tracked non-conformance so the existing
 * root-cause / CAPA / independent-verification flow drives it to closure.
 * Risk maps to NCR severity. One live NCR per requirement.
 */
export async function raiseNcrForGap(id: string, user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    const req = await lockRequirement(client, id);
    if (!['partially_compliant', 'non_compliant'].includes(req.status)) {
      throw new ConflictError('Only a requirement with an assessed gap can have a non-conformance raised');
    }
    if (req.ncr_id) {
      const existing = await client.query<{ ncr_code: string; status: string }>(
        'SELECT ncr_code, status FROM non_conformances WHERE id = $1',
        [req.ncr_id],
      );
      const e = existing.rows[0];
      if (e && ['open', 'investigating'].includes(e.status)) {
        throw new ConflictError(`${e.ncr_code} is already open for this gap`);
      }
    }
    const { ncr } = await insertNcrTx(
      client,
      {
        title: `Compliance gap ${req.req_code}: ${req.title}`.slice(0, 200),
        description: `Regulation: ${req.regulation}${req.reference ? ` (${req.reference})` : ''}\n\nGap: ${req.gap}\n\nCurrent status: ${req.current_status}${
          req.corrective_action ? `\n\nProposed action: ${req.corrective_action}` : ''
        }`,
        department: req.department as (typeof DEPARTMENTS)[number],
        source: 'internal_audit',
        severity: RISK_TO_NCR_SEVERITY[req.risk ?? 'medium'],
        seedLotId: null,
        assignedTo: req.responsible_email,
        dueDate: req.target_date,
      },
      user,
    );
    const updated = await client.query<RequirementRow>(
      'UPDATE compliance_requirements SET ncr_id = $2 WHERE id = $1 RETURNING *',
      [id, ncr.id],
    );
    await insertAuditLog(client, {
      entityType: 'compliance_requirement',
      entityId: id,
      action: 'RAISE_NCR',
      performedBy: user.email,
      afterState: updated.rows[0],
      metadata: { ncrId: ncr.id, ncrCode: ncr.ncr_code },
    });
    return { requirement: updated.rows[0], ncr };
  });
}

// ------------------------------------------------------------ dashboard

export async function getComplianceDashboard() {
  const [totals, byCategory, byRisk, upcoming] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'not_assessed')::int AS not_assessed,
         COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
         COUNT(*) FILTER (WHERE status = 'partially_compliant')::int AS partially_compliant,
         COUNT(*) FILTER (WHERE status = 'non_compliant')::int AS non_compliant,
         COUNT(*) FILTER (WHERE status = 'not_applicable')::int AS not_applicable,
         COUNT(*) FILTER (WHERE status IN ('partially_compliant','non_compliant') AND target_date < CURRENT_DATE)::int AS overdue_gaps,
         COUNT(*) FILTER (WHERE status IN ('partially_compliant','non_compliant') AND ncr_id IS NULL)::int AS gaps_without_ncr,
         COUNT(*) FILTER (WHERE next_review_date < CURRENT_DATE)::int AS reviews_overdue
       FROM compliance_requirements`,
    ),
    pool.query(
      `SELECT category,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
              COUNT(*) FILTER (WHERE status IN ('partially_compliant','non_compliant'))::int AS gaps,
              COUNT(*) FILTER (WHERE status = 'not_assessed')::int AS not_assessed
         FROM compliance_requirements GROUP BY category ORDER BY category`,
    ),
    pool.query(
      `SELECT risk, COUNT(*)::int AS count FROM compliance_requirements
        WHERE status IN ('partially_compliant','non_compliant') GROUP BY risk`,
    ),
    pool.query(
      `SELECT id, req_code, title, status, risk, target_date, responsible_email
         FROM compliance_requirements
        WHERE status IN ('partially_compliant','non_compliant')
        ORDER BY target_date ASC LIMIT 5`,
    ),
  ]);
  const t = totals.rows[0];
  const applicable = t.total - t.not_applicable;
  return {
    totals: t,
    // Straight ratios of stored records — "assessed" is how much of the
    // applicable register has a verdict, not a made-up health score.
    assessedOfApplicable: { assessed: applicable - t.not_assessed, applicable },
    byCategory: byCategory.rows,
    openGapsByRisk: Object.fromEntries(REQ_RISKS.map((r) => [r, byRisk.rows.find((x) => x.risk === r)?.count ?? 0])),
    nextGapsDue: upcoming.rows,
  };
}

// ------------------------------------------------------------ gap report (CSV)

function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // Spreadsheet apps execute cells that start with these characters as formulas.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const STATUS_LABEL: Record<string, string> = {
  not_assessed: 'Not assessed',
  compliant: 'Compliant',
  partially_compliant: 'Partially compliant',
  non_compliant: 'Non-compliant',
  not_applicable: 'Not applicable',
};

/** The Seed Compliance Gap Assessment Report: Requirement → Current Status → Gap → Risk → Corrective Action → Responsible → Target Date → Evidence. */
export async function buildGapReportCsv(filters: RequirementFilters): Promise<string> {
  const rows = await listRequirements(filters);
  const evidence = await pool.query(
    'SELECT requirement_id, title, reference FROM compliance_evidence ORDER BY added_at',
  );
  const evByReq = new Map<string, string[]>();
  for (const e of evidence.rows) {
    const list = evByReq.get(e.requirement_id) ?? [];
    list.push(e.reference ? `${e.title} (${e.reference})` : e.title);
    evByReq.set(e.requirement_id, list);
  }
  const header = [
    'Code', 'Regulation', 'Reference', 'Requirement', 'Category', 'Department', 'Status', 'Current status',
    'Gap', 'Risk', 'Corrective action', 'Linked NCR', 'Responsible person', 'Target date', 'Evidence',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.req_code, r.regulation, r.reference, r.title, r.category, r.department, STATUS_LABEL[r.status] ?? r.status,
        r.current_status, r.gap, r.risk, r.corrective_action, r.ncr_code, r.responsible_email,
        r.target_date ? new Date(r.target_date).toISOString().slice(0, 10) : '',
        (evByReq.get(r.id) ?? []).join('; '),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

// ------------------------------------------------------------ starter template

export async function loadStarterTemplate(user: AuthenticatedUser) {
  return withTransaction(async (client) => {
    let added = 0;
    for (const item of SEED_COMPANY_STARTER) {
      const exists = await client.query(
        'SELECT 1 FROM compliance_requirements WHERE regulation = $1 AND title = $2',
        [item.regulation, item.title],
      );
      if (exists.rows[0]) continue;
      const code = await nextCode(client, 'REQ', 3, false);
      const inserted = await client.query(
        `INSERT INTO compliance_requirements
           (req_code, regulation, reference, title, description, category, department, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [code, item.regulation, item.reference ?? null, item.title, item.description, item.category, item.department, user.email],
      );
      await insertAuditLog(client, {
        entityType: 'compliance_requirement',
        entityId: inserted.rows[0].id,
        action: 'CREATE',
        performedBy: user.email,
        metadata: { source: 'starter_template' },
      });
      added += 1;
    }
    return { added, skipped: SEED_COMPANY_STARTER.length - added, templateSize: SEED_COMPANY_STARTER.length };
  });
}
