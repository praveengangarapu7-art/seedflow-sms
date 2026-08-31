import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type {
  ComplianceAuditReport,
  DataAccessLogInput,
  FarmerExport,
  RetentionCandidate,
  RetentionPolicyRow,
  UpdateRetentionPolicyInput,
} from './privacy.types';

/**
 * Fire-and-forget by design (matches every other best-effort logging call
 * in this codebase, e.g. pushNotifications/monitoring) — a failure to log
 * an access must never block or fail the read it's logging.
 */
export function logDataAccess(input: DataAccessLogInput): void {
  pool
    .query(
      `INSERT INTO data_access_logs (entity_type, entity_id, access_type, accessed_by, accessed_by_role, was_masked, route)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [input.entityType, input.entityId, input.accessType, input.accessedBy, input.accessedByRole, input.wasMasked, input.route ?? null],
    )
    .catch((error) => console.error('[privacy] failed to log data access:', error));
}

export async function listDataAccessLogs(filters: { entityId?: string; windowHours?: number }) {
  const windowHours = filters.windowHours ?? 24 * 30;
  const conditions = [`created_at >= now() - ($1 || ' hours')::interval`];
  const values: unknown[] = [windowHours];
  if (filters.entityId) {
    values.push(filters.entityId);
    conditions.push(`entity_id = $${values.length}`);
  }
  const result = await pool.query(
    `SELECT * FROM data_access_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 500`,
    values,
  );
  return result.rows;
}

/**
 * Every table with a foreign key into farmers, gathered into one export —
 * the "data export in standard formats" requirement. JSON is the native
 * shape; toCsvSections() below flattens the same data into CSV.
 */
export async function exportFarmerData(farmerId: string, user: AuthenticatedUser): Promise<FarmerExport> {
  const farmerResult = await pool.query('SELECT * FROM farmers WHERE id = $1', [farmerId]);
  const farmer = farmerResult.rows[0];
  if (!farmer) throw new NotFoundError(`Farmer ${farmerId} not found`);

  const [farms, seedRequests, performanceRatings, cropPlans, fieldInspections] = await Promise.all([
    pool.query('SELECT * FROM farms WHERE farmer_id = $1 ORDER BY created_at ASC', [farmerId]),
    pool.query('SELECT * FROM seed_requests WHERE farmer_id = $1 ORDER BY created_at ASC', [farmerId]),
    pool.query('SELECT * FROM performance_ratings WHERE farmer_id = $1 ORDER BY created_at ASC', [farmerId]),
    pool.query('SELECT * FROM crop_plans WHERE farmer_id = $1 ORDER BY created_at ASC', [farmerId]),
    pool.query('SELECT * FROM lot_field_inspections WHERE farmer_id = $1 ORDER BY created_at ASC', [farmerId]),
  ]);

  logDataAccess({
    entityType: 'farmer',
    entityId: farmerId,
    accessType: 'export',
    accessedBy: user.email,
    accessedByRole: user.role,
    wasMasked: false,
    route: '/privacy/farmers/:id/export',
  });

  return {
    exportedAt: new Date().toISOString(),
    farmer,
    farms: farms.rows,
    seedRequests: seedRequests.rows,
    performanceRatings: performanceRatings.rows,
    cropPlans: cropPlans.rows,
    fieldInspections: fieldInspections.rows,
  };
}

/** Flattens a FarmerExport into named CSV sections for a straightforward multi-table CSV download. */
export function toCsvSections(data: FarmerExport): { name: string; csv: string }[] {
  function rowsToCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      if (value === null || value === undefined) return '';
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))];
    return lines.join('\n');
  }

  return [
    { name: 'farmer', csv: rowsToCsv([data.farmer]) },
    { name: 'farms', csv: rowsToCsv(data.farms) },
    { name: 'seed_requests', csv: rowsToCsv(data.seedRequests) },
    { name: 'performance_ratings', csv: rowsToCsv(data.performanceRatings) },
    { name: 'crop_plans', csv: rowsToCsv(data.cropPlans) },
    { name: 'field_inspections', csv: rowsToCsv(data.fieldInspections) },
  ];
}

/**
 * Right to forget, implemented as anonymize-in-place — a hard DELETE isn't
 * viable for any farmer with real activity (seed_requests, performance_ratings,
 * farms, and crop_plans all reference farmers with ON DELETE RESTRICT), and
 * even where it would be allowed, erasing the row would destroy the business/
 * audit trail those tables exist to preserve. Scrubbing name/phone/location
 * while keeping the row (and every foreign-keyed record pointing at it)
 * intact is the standard, defensible interpretation of "right to erasure"
 * here — GDPR Art. 17(3) itself permits retaining data necessary to fulfil
 * other legal/record-keeping obligations.
 *
 * Also remediates the one leak this schema has outside the farmers table
 * itself: seedRequests.fulfillRequest and cropPlanning.reserveSeedLot both
 * embed a raw "Farmer: <name>" string into seed_lot_allocations.allocated_to,
 * which has no FK back to farmers and would otherwise keep the old name
 * forever even after this runs.
 */
export async function anonymizeFarmer(farmerId: string, reason: string, user: AuthenticatedUser): Promise<void> {
  if (!reason?.trim()) throw new ValidationError('reason is required to anonymize a farmer');

  await withTransaction(async (client) => {
    const farmerResult = await client.query('SELECT * FROM farmers WHERE id = $1 FOR UPDATE', [farmerId]);
    const farmer = farmerResult.rows[0];
    if (!farmer) throw new NotFoundError(`Farmer ${farmerId} not found`);
    if (farmer.anonymized) throw new ConflictError('This farmer has already been anonymized');

    await client.query(`UPDATE seed_lot_allocations SET allocated_to = 'Farmer: [ANONYMIZED]' WHERE allocated_to = $1`, [
      `Farmer: ${farmer.name}`,
    ]);

    const updated = await client.query(
      `UPDATE farmers
       SET name = 'Anonymized Farmer', phone = NULL, location = NULL,
           anonymized = true, anonymized_at = now(), anonymized_by = $1, anonymization_reason = $2
       WHERE id = $3
       RETURNING *`,
      [user.email, reason.trim(), farmerId],
    );

    await insertAuditLog(client, {
      entityType: 'farmer',
      entityId: farmerId,
      action: 'ANONYMIZE',
      performedBy: user.email,
      beforeState: { name: farmer.name, phone: farmer.phone, location: farmer.location },
      afterState: updated.rows[0],
      metadata: { reason: reason.trim() },
    });
  });
}

export async function listRetentionPolicies(): Promise<RetentionPolicyRow[]> {
  const result = await pool.query('SELECT * FROM data_retention_policies ORDER BY entity_type ASC');
  return result.rows;
}

export async function updateRetentionPolicy(
  entityType: string,
  input: UpdateRetentionPolicyInput,
  user: AuthenticatedUser,
): Promise<RetentionPolicyRow> {
  if (input.retentionDays !== undefined && (!Number.isInteger(input.retentionDays) || input.retentionDays <= 0)) {
    throw new ValidationError('retentionDays must be a positive integer');
  }

  const result = await pool.query(
    `UPDATE data_retention_policies
     SET retention_days = COALESCE($1, retention_days),
         is_active = COALESCE($2, is_active),
         description = COALESCE($3, description),
         updated_by = $4,
         updated_at = now()
     WHERE entity_type = $5
     RETURNING *`,
    [input.retentionDays ?? null, input.isActive ?? null, input.description ?? null, user.email, entityType],
  );
  const updated = result.rows[0];
  if (!updated) throw new NotFoundError(`No retention policy exists for entity type "${entityType}"`);
  return updated;
}

export async function getRetentionDaysFor(entityType: string, fallbackDays: number): Promise<number> {
  const result = await pool.query<{ retention_days: number }>(
    `SELECT retention_days FROM data_retention_policies WHERE entity_type = $1 AND is_active = true`,
    [entityType],
  );
  return result.rows[0]?.retention_days ?? fallbackDays;
}

/**
 * A farmer's "last activity" is the most recent row across every table
 * that references them — not a stored/denormalized value, since farms/
 * seed_requests/performance_ratings/crop_plans are exactly the tables that
 * would refresh it and recomputing live avoids yet another sync path to
 * keep correct.
 */
export async function scanRetentionCandidates(): Promise<RetentionCandidate[]> {
  const retentionDays = await getRetentionDaysFor('farmer', 730);

  const result = await pool.query<{
    id: string;
    name: string;
    region: string;
    last_activity_at: string | null;
  }>(
    `SELECT f.id, f.name, f.region,
            GREATEST(
              (SELECT MAX(created_at) FROM farms WHERE farmer_id = f.id),
              (SELECT MAX(created_at) FROM seed_requests WHERE farmer_id = f.id),
              (SELECT MAX(created_at) FROM performance_ratings WHERE farmer_id = f.id),
              (SELECT MAX(created_at) FROM crop_plans WHERE farmer_id = f.id),
              f.created_at
            ) AS last_activity_at
     FROM farmers f
     WHERE f.anonymized = false`,
  );

  const now = Date.now();
  return result.rows
    .map((row) => {
      const lastActivityAt = row.last_activity_at;
      const daysSinceActivity = lastActivityAt ? Math.floor((now - new Date(lastActivityAt).getTime()) / 86_400_000) : null;
      return { farmerId: row.id, name: row.name, region: row.region, lastActivityAt, daysSinceActivity };
    })
    .filter((entry) => entry.daysSinceActivity !== null && entry.daysSinceActivity >= retentionDays);
}

export async function getComplianceAudit(): Promise<ComplianceAuditReport> {
  const windowDays = 30;

  const [totals, accessStats, accessByRole, retentionCandidates] = await Promise.all([
    pool.query<{ total: string; anonymized: string }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE anonymized)::int AS anonymized FROM farmers`,
    ),
    pool.query<{ total_accesses: string; unmasked: string; exports: string }>(
      `SELECT COUNT(*)::int AS total_accesses,
              COUNT(*) FILTER (WHERE was_masked = false)::int AS unmasked,
              COUNT(*) FILTER (WHERE access_type = 'export')::int AS exports
       FROM data_access_logs
       WHERE created_at >= now() - ($1 || ' days')::interval`,
      [windowDays],
    ),
    pool.query<{ accessed_by_role: string; count: string; unmasked_count: string }>(
      `SELECT accessed_by_role,
              COUNT(*)::int AS count,
              COUNT(*) FILTER (WHERE was_masked = false)::int AS unmasked_count
       FROM data_access_logs
       WHERE created_at >= now() - ($1 || ' days')::interval
       GROUP BY accessed_by_role
       ORDER BY count DESC`,
      [windowDays],
    ),
    scanRetentionCandidates(),
  ]);

  const total = Number(totals.rows[0].total);
  const anonymized = Number(totals.rows[0].anonymized);
  const totalAccesses = Number(accessStats.rows[0].total_accesses);
  const unmaskedAccesses = Number(accessStats.rows[0].unmasked);

  return {
    totalFarmers: total,
    anonymizedFarmers: anonymized,
    retentionCandidateCount: retentionCandidates.length,
    dataAccess: {
      windowDays,
      totalAccesses,
      unmaskedAccesses,
      exportCount: Number(accessStats.rows[0].exports),
      byRole: accessByRole.rows.map((row) => ({
        role: row.accessed_by_role,
        count: Number(row.count),
        unmaskedCount: Number(row.unmasked_count),
      })),
    },
    // General, well-established data-protection principles (GDPR Art. 5 and
    // equivalents in most agricultural/personal-data frameworks) checked
    // against what this system actually does today — not a claim of
    // certified compliance with any specific named regulation.
    principles: [
      {
        principle: 'Data minimization & purpose limitation',
        status: 'met',
        note: 'Only name, phone, and region/location are collected for farmers — no fields beyond what seed distribution and field operations require.',
      },
      {
        principle: 'Storage limitation',
        status: retentionCandidates.length > 0 ? 'attention' : 'met',
        note:
          retentionCandidates.length > 0
            ? `${retentionCandidates.length} farmer(s) have exceeded the configured retention window with no recent activity and are candidates for anonymization.`
            : 'No farmer currently exceeds the configured retention window.',
      },
      {
        principle: 'Integrity, confidentiality & access control',
        status: 'met',
        note: 'Farmer PII is masked for roles without an operational need to see it (Breeder, Inspector); Admin/Producer/Warehouse Manager retain full access where their existing workflows require it.',
      },
      {
        principle: 'Accountability (records of processing)',
        status: totalAccesses > 0 ? 'met' : 'attention',
        note: `${totalAccesses} data access event(s) logged in the last ${windowDays} days (${unmaskedAccesses} unmasked).`,
      },
      {
        principle: 'Right of erasure',
        status: 'met',
        note: `${anonymized} of ${total} farmer record(s) have been anonymized on request; anonymization also remediates the farmer name embedded in past seed_lot_allocations records.`,
      },
      {
        principle: 'Right to data portability',
        status: 'met',
        note: 'A full data export (JSON/CSV, every linked farm/request/rating/crop-plan/inspection record) is available per farmer.',
      },
    ],
  };
}
