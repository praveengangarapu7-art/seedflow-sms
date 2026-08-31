import { randomUUID } from 'crypto';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { assertOwnsOrganization } from '../../auth/ownership';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { getQualityMetrics } from '../compliance/compliance.service';
import { getFarmer } from '../farmers/farmers.service';
import { getSeedLotById } from '../seedLots/seedLots.service';
import { evaluateRegistrationEligibility } from './registrationEligibility';
import { evaluateSubsidyEligibility } from './subsidyEligibility';
import {
  GOVERNMENT_REPORT_TYPES,
  type ClaimStatus,
  type CreateSubsidyClaimInput,
  type CreateSubsidyProgramInput,
  type DistributionReportEntry,
  type GovernmentReportRow,
  type LotGovernmentRegistrationRow,
  type ProductionReportEntry,
  type QualityReportEntry,
  type RegistrationStatus,
  type SubsidyClaimRow,
  type SubsidyProgramRow,
} from './govPrograms.types';

// The regulatory sign-off authority in this app's RBAC model — the same
// pair used for compliance certificate issuance and authenticity
// certificates elsewhere in this codebase.
export const GOVERNMENT_DECISION_ROLES = ['Admin', 'Inspector'];

// --- Lot government registrations ------------------------------------

export async function submitRegistration(
  seedLotId: string,
  authorityOrgId: string,
  user: AuthenticatedUser,
): Promise<LotGovernmentRegistrationRow> {
  const lot = await getSeedLotById(seedLotId);
  assertOwnsOrganization(user, lot.organization_id, 'You can only submit registrations for seed lots owned by your organization');

  const authorityResult = await pool.query<{ type: string }>('SELECT type FROM organizations WHERE id = $1', [authorityOrgId]);
  if (!authorityResult.rows[0]) throw new NotFoundError(`Organization ${authorityOrgId} not found`);
  if (authorityResult.rows[0].type !== 'government_authority') {
    throw new ValidationError('authorityOrgId must refer to an organization of type "government_authority"');
  }

  const existing = await pool.query(
    `SELECT 1 FROM lot_government_registrations WHERE seed_lot_id = $1 AND authority_org_id = $2 AND status != 'rejected'`,
    [seedLotId, authorityOrgId],
  );
  if (existing.rows[0]) {
    throw new ConflictError('A registration for this lot with this authority is already active — wait for a decision or its rejection before resubmitting');
  }

  const metrics = await getQualityMetrics(seedLotId);
  const validCertResult = await pool.query(
    `SELECT 1 FROM phytosanitary_certificates WHERE seed_lot_id = $1 AND status = 'valid' LIMIT 1`,
    [seedLotId],
  );
  const { autoApprove, reasons } = evaluateRegistrationEligibility({
    stage: lot.stage,
    hasValidPhytosanitaryCertificate: Boolean(validCertResult.rows[0]),
    germinationAveragePercent: metrics.germination.averagePercent,
  });

  return withTransaction(async (client) => {
    const now = new Date().toISOString();
    const status: RegistrationStatus = autoApprove ? 'approved' : 'under_review';
    const registrationNumber = autoApprove ? `GOV-REG-${lot.lot_code}-${randomUUID().slice(0, 8).toUpperCase()}` : null;

    const result = await client.query<LotGovernmentRegistrationRow>(
      `INSERT INTO lot_government_registrations
         (seed_lot_id, authority_org_id, status, registration_number, submitted_by, submitted_at, decided_by, decided_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        seedLotId,
        authorityOrgId,
        status,
        registrationNumber,
        user.email,
        now,
        autoApprove ? 'system:auto-approve' : null,
        autoApprove ? now : null,
        autoApprove ? null : `Pending manual review: ${reasons.join('; ')}`,
      ],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'lot_government_registration',
      entityId: row.id,
      action: autoApprove ? 'AUTO_APPROVE' : 'SUBMIT',
      performedBy: user.email,
      afterState: row,
      metadata: { seedLotId, authorityOrgId, reasons },
    });

    return row;
  });
}

export async function decideRegistration(
  registrationId: string,
  decision: 'approved' | 'rejected',
  reason: string | undefined,
  user: AuthenticatedUser,
): Promise<LotGovernmentRegistrationRow> {
  if (!GOVERNMENT_DECISION_ROLES.includes(user.role)) {
    throw new ForbiddenError(`Only ${GOVERNMENT_DECISION_ROLES.join(' or ')} can decide a government registration`);
  }
  if (decision === 'rejected' && !reason?.trim()) {
    throw new ValidationError('A rejection reason is required');
  }

  return withTransaction(async (client) => {
    const existingResult = await client.query<LotGovernmentRegistrationRow>(
      'SELECT * FROM lot_government_registrations WHERE id = $1 FOR UPDATE',
      [registrationId],
    );
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Registration ${registrationId} not found`);
    if (existing.status !== 'under_review' && existing.status !== 'submitted') {
      throw new ConflictError(`Registration is "${existing.status}" — expected "submitted" or "under_review"`);
    }

    const lotResult = await client.query<{ lot_code: string }>('SELECT lot_code FROM seed_lots WHERE id = $1', [existing.seed_lot_id]);
    const registrationNumber =
      decision === 'approved' ? `GOV-REG-${lotResult.rows[0].lot_code}-${randomUUID().slice(0, 8).toUpperCase()}` : null;

    const result = await client.query<LotGovernmentRegistrationRow>(
      `UPDATE lot_government_registrations
       SET status = $1, registration_number = COALESCE($2, registration_number), decided_by = $3, decided_at = now(), rejection_reason = $4
       WHERE id = $5 RETURNING *`,
      [decision, registrationNumber, user.email, decision === 'rejected' ? reason!.trim() : null, registrationId],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'lot_government_registration',
      entityId: registrationId,
      action: decision === 'approved' ? 'APPROVE' : 'REJECT',
      performedBy: user.email,
      beforeState: { status: existing.status },
      afterState: { status: row.status },
    });

    return row;
  });
}

export async function listRegistrationsForLot(seedLotId: string): Promise<LotGovernmentRegistrationRow[]> {
  const result = await pool.query<LotGovernmentRegistrationRow>(
    'SELECT * FROM lot_government_registrations WHERE seed_lot_id = $1 ORDER BY created_at DESC',
    [seedLotId],
  );
  return result.rows;
}

export async function listRegistrations(filters: { authorityOrgId?: string; status?: string }): Promise<LotGovernmentRegistrationRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.authorityOrgId) {
    values.push(filters.authorityOrgId);
    conditions.push(`authority_org_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<LotGovernmentRegistrationRow>(
    `SELECT * FROM lot_government_registrations ${whereClause} ORDER BY created_at DESC`,
    values,
  );
  return result.rows;
}

async function hasApprovedRegistration(seedLotId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM lot_government_registrations WHERE seed_lot_id = $1 AND status = 'approved' LIMIT 1`,
    [seedLotId],
  );
  return Boolean(result.rows[0]);
}

// --- Subsidy programs --------------------------------------------------

export async function createSubsidyProgram(input: CreateSubsidyProgramInput, user: AuthenticatedUser): Promise<SubsidyProgramRow> {
  if (!input.name?.trim()) throw new ValidationError('name is required');
  if (!input.authorityOrgId) throw new ValidationError('authorityOrgId is required');
  if (!Number.isFinite(Number(input.subsidyAmountPerUnit)) || Number(input.subsidyAmountPerUnit) <= 0) {
    throw new ValidationError('subsidyAmountPerUnit must be a positive number');
  }

  const authorityResult = await pool.query<{ type: string }>('SELECT type FROM organizations WHERE id = $1', [input.authorityOrgId]);
  if (!authorityResult.rows[0]) throw new NotFoundError(`Organization ${input.authorityOrgId} not found`);
  if (authorityResult.rows[0].type !== 'government_authority') {
    throw new ValidationError('authorityOrgId must refer to an organization of type "government_authority"');
  }

  const criteria = input.eligibilityCriteria ?? {};
  if (criteria.maxQuantityPerFarmer !== undefined && (!Number.isFinite(criteria.maxQuantityPerFarmer) || criteria.maxQuantityPerFarmer <= 0)) {
    throw new ValidationError('eligibilityCriteria.maxQuantityPerFarmer must be a positive number');
  }
  if (criteria.eligibleRegions !== undefined && !Array.isArray(criteria.eligibleRegions)) {
    throw new ValidationError('eligibilityCriteria.eligibleRegions must be an array of region names');
  }

  const result = await pool.query<SubsidyProgramRow>(
    `INSERT INTO subsidy_programs
       (name, authority_org_id, crop, min_stage, requires_government_registration, subsidy_amount_per_unit, unit, eligibility_criteria, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'kg'), $8::jsonb, $9)
     RETURNING *`,
    [
      input.name.trim(),
      input.authorityOrgId,
      input.crop?.trim() || null,
      input.minStage ?? null,
      input.requiresGovernmentRegistration ?? false,
      input.subsidyAmountPerUnit,
      input.unit ?? null,
      JSON.stringify(criteria),
      user.email,
    ],
  );
  return result.rows[0];
}

export async function listSubsidyPrograms(filters: { crop?: string; isActive?: boolean } = {}): Promise<SubsidyProgramRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.isActive !== undefined) {
    values.push(filters.isActive);
    conditions.push(`is_active = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<SubsidyProgramRow>(`SELECT * FROM subsidy_programs ${whereClause} ORDER BY created_at DESC`, values);
  return result.rows;
}

export async function getSubsidyProgram(id: string): Promise<SubsidyProgramRow> {
  const result = await pool.query<SubsidyProgramRow>('SELECT * FROM subsidy_programs WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Subsidy program ${id} not found`);
  return row;
}

export async function setSubsidyProgramActive(id: string, isActive: boolean, user: AuthenticatedUser): Promise<SubsidyProgramRow> {
  return withTransaction(async (client) => {
    const result = await client.query<SubsidyProgramRow>(
      'UPDATE subsidy_programs SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [isActive, id],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundError(`Subsidy program ${id} not found`);
    await insertAuditLog(client, {
      entityType: 'subsidy_program',
      entityId: id,
      action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
      performedBy: user.email,
      afterState: { isActive },
    });
    return row;
  });
}

// --- Subsidy claims ------------------------------------------------------

async function farmerPriorClaimedQuantity(programId: string, farmerId: string): Promise<number> {
  const result = await pool.query<{ total: string | null }>(
    `SELECT SUM(quantity) AS total FROM subsidy_claims
     WHERE program_id = $1 AND farmer_id = $2 AND status IN ('submitted', 'under_review', 'approved', 'paid')`,
    [programId, farmerId],
  );
  return Number(result.rows[0].total ?? 0);
}

export async function submitSubsidyClaim(input: CreateSubsidyClaimInput, user: AuthenticatedUser): Promise<SubsidyClaimRow> {
  if (!input.programId) throw new ValidationError('programId is required');
  if (!input.farmerId) throw new ValidationError('farmerId is required');
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) {
    throw new ValidationError('quantity must be a positive number');
  }

  const program = await getSubsidyProgram(input.programId);
  if (!program.is_active) throw new ConflictError('This subsidy program is not currently active');
  const farmer = await getFarmer(input.farmerId);
  const lot = await getSeedLotById(input.seedLotId);
  const lotHasApprovedRegistration = await hasApprovedRegistration(input.seedLotId);
  const priorClaimed = await farmerPriorClaimedQuantity(input.programId, input.farmerId);

  const { eligible, reasons } = evaluateSubsidyEligibility({
    programCrop: program.crop,
    programMinStage: program.min_stage,
    programRequiresGovernmentRegistration: program.requires_government_registration,
    programMaxQuantityPerFarmer: program.eligibility_criteria.maxQuantityPerFarmer ?? null,
    programEligibleRegions: program.eligibility_criteria.eligibleRegions,
    lotCrop: lot.crop,
    lotStage: lot.stage,
    lotHasApprovedRegistration,
    farmerRegion: farmer.region,
    requestedQuantity: Number(input.quantity),
    farmerPriorClaimedQuantity: priorClaimed,
  });
  if (!eligible) {
    throw new ValidationError(`Not eligible for this subsidy program: ${reasons.join('; ')}`);
  }

  const claimAmount = Math.round(Number(input.quantity) * Number(program.subsidy_amount_per_unit) * 100) / 100;
  const claimNumber = `CLAIM-${randomUUID().slice(0, 8).toUpperCase()}`;

  return withTransaction(async (client) => {
    const result = await client.query<SubsidyClaimRow>(
      `INSERT INTO subsidy_claims (claim_number, program_id, farmer_id, seed_lot_id, quantity, claim_amount, submitted_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [claimNumber, input.programId, input.farmerId, input.seedLotId, input.quantity, claimAmount, user.email, input.notes ?? null],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'subsidy_claim',
      entityId: row.id,
      action: 'SUBMIT',
      performedBy: user.email,
      afterState: row,
      metadata: { programId: input.programId, farmerId: input.farmerId },
    });
    return row;
  });
}

export async function getSubsidyClaim(id: string): Promise<SubsidyClaimRow> {
  const result = await pool.query<SubsidyClaimRow>('SELECT * FROM subsidy_claims WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Subsidy claim ${id} not found`);
  return row;
}

async function transitionClaimStatus(
  id: string,
  fromStatuses: ClaimStatus[],
  toStatus: ClaimStatus,
  user: AuthenticatedUser,
  action: string,
  extra?: { rejectionReason?: string; paymentReference?: string },
): Promise<SubsidyClaimRow> {
  return withTransaction(async (client) => {
    const existingResult = await client.query<SubsidyClaimRow>('SELECT * FROM subsidy_claims WHERE id = $1 FOR UPDATE', [id]);
    const claim = existingResult.rows[0];
    if (!claim) throw new NotFoundError(`Subsidy claim ${id} not found`);
    if (!fromStatuses.includes(claim.status)) {
      throw new ConflictError(`Subsidy claim is "${claim.status}" — expected one of: ${fromStatuses.join(', ')}`);
    }

    const result = await client.query<SubsidyClaimRow>(
      `UPDATE subsidy_claims
       SET status = $1, decided_by = COALESCE($2, decided_by), decided_at = COALESCE($3, decided_at),
           rejection_reason = COALESCE($4, rejection_reason), paid_at = COALESCE($5, paid_at), payment_reference = COALESCE($6, payment_reference)
       WHERE id = $7 RETURNING *`,
      [
        toStatus,
        action === 'PAY' ? null : user.email,
        action === 'PAY' ? null : new Date().toISOString(),
        extra?.rejectionReason ?? null,
        action === 'PAY' ? new Date().toISOString() : null,
        extra?.paymentReference ?? null,
        id,
      ],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'subsidy_claim',
      entityId: id,
      action,
      performedBy: user.email,
      beforeState: { status: claim.status },
      afterState: { status: row.status },
    });

    return row;
  });
}

export async function approveSubsidyClaim(id: string, user: AuthenticatedUser): Promise<SubsidyClaimRow> {
  if (!GOVERNMENT_DECISION_ROLES.includes(user.role)) {
    throw new ForbiddenError(`Only ${GOVERNMENT_DECISION_ROLES.join(' or ')} can approve a subsidy claim`);
  }
  return transitionClaimStatus(id, ['submitted', 'under_review'], 'approved', user, 'APPROVE');
}

export async function rejectSubsidyClaim(id: string, reason: string, user: AuthenticatedUser): Promise<SubsidyClaimRow> {
  if (!GOVERNMENT_DECISION_ROLES.includes(user.role)) {
    throw new ForbiddenError(`Only ${GOVERNMENT_DECISION_ROLES.join(' or ')} can reject a subsidy claim`);
  }
  if (!reason?.trim()) throw new ValidationError('A rejection reason is required');
  return transitionClaimStatus(id, ['submitted', 'under_review'], 'rejected', user, 'REJECT', { rejectionReason: reason.trim() });
}

/** Disbursement is a financial action, gated to Admin only — the same trust level as other money/authority-establishing actions in this app (createOrganization, partner-link approval). */
export async function markSubsidyClaimPaid(id: string, paymentReference: string, user: AuthenticatedUser): Promise<SubsidyClaimRow> {
  if (user.role !== 'Admin') throw new ForbiddenError('Only Admin can mark a subsidy claim as paid');
  if (!paymentReference?.trim()) throw new ValidationError('paymentReference is required');
  return transitionClaimStatus(id, ['approved'], 'paid', user, 'PAY', { paymentReference: paymentReference.trim() });
}

export async function listSubsidyClaims(filters: { farmerId?: string; programId?: string; status?: string } = {}): Promise<SubsidyClaimRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.farmerId) {
    values.push(filters.farmerId);
    conditions.push(`farmer_id = $${values.length}`);
  }
  if (filters.programId) {
    values.push(filters.programId);
    conditions.push(`program_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<SubsidyClaimRow>(`SELECT * FROM subsidy_claims ${whereClause} ORDER BY created_at DESC`, values);
  return result.rows;
}

// --- Government reports (production / distribution / quality) ----------

async function buildProductionReport(cropYear?: number): Promise<ProductionReportEntry[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (cropYear) {
    values.push(cropYear);
    conditions.push(`EXTRACT(YEAR FROM production_date) = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<{ crop: string; variety: string; stage: string; lot_count: string; total_quantity: string; unit: string }>(
    `SELECT crop, variety, stage, unit, COUNT(*) AS lot_count, SUM(quantity_total) AS total_quantity
     FROM seed_lots ${whereClause}
     GROUP BY crop, variety, stage, unit
     ORDER BY crop ASC, variety ASC, stage ASC`,
    values,
  );
  return result.rows.map((r) => ({
    crop: r.crop,
    variety: r.variety,
    stage: r.stage,
    lotCount: Number(r.lot_count),
    totalQuantity: Number(r.total_quantity),
    unit: r.unit,
  }));
}

/**
 * "Distribution" is reported as subsidy claims, not raw allocations — a
 * government subsidy report cares about what farmers actually claimed
 * against these varieties, which is the natural output of this feature's
 * own claims data rather than the generic internal allocation ledger.
 */
async function buildDistributionReport(): Promise<DistributionReportEntry[]> {
  const result = await pool.query<{
    crop: string;
    variety: string;
    claim_count: string;
    farmer_count: string;
    total_quantity_claimed: string;
    total_subsidy_amount: string;
  }>(
    `SELECT sl.crop, sl.variety,
            COUNT(*) AS claim_count,
            COUNT(DISTINCT sc.farmer_id) AS farmer_count,
            SUM(sc.quantity) AS total_quantity_claimed,
            SUM(sc.claim_amount) AS total_subsidy_amount
     FROM subsidy_claims sc
     JOIN seed_lots sl ON sl.id = sc.seed_lot_id
     WHERE sc.status IN ('approved', 'paid')
     GROUP BY sl.crop, sl.variety
     ORDER BY sl.crop ASC, sl.variety ASC`,
  );
  return result.rows.map((r) => ({
    crop: r.crop,
    variety: r.variety,
    claimCount: Number(r.claim_count),
    farmerCount: Number(r.farmer_count),
    totalQuantityClaimed: Number(r.total_quantity_claimed),
    totalSubsidyAmount: Number(r.total_subsidy_amount),
  }));
}

interface CropVarietyRateRow {
  crop: string;
  variety: string;
  total_sample: string | null;
  total_success: string | null;
  test_count: string;
}

/**
 * One aggregate query per test type, grouped by crop+variety directly in
 * SQL — NOT one getQualityMetrics() call per lot. A per-lot fan-out here
 * would issue 3+ queries for every seed lot in the table; on this app's own
 * dev/test data (tens of thousands of lots accumulated across this
 * session's testing) that fan-out timed out outright. This mirrors
 * compliance.service.ts's computeRateSummary math (sum of successes over
 * sum of sample sizes = a properly sample-weighted average, not an average
 * of averages) but grouped by variety instead of by a single seed lot.
 */
async function queryRateByVariety(table: 'purity_tests' | 'viability_tests' | 'germination_tests'): Promise<Map<string, { averagePercent: number | null; testCount: number }>> {
  const sampleColumn = table === 'purity_tests' ? 'sample_weight' : 'sample_size';
  const successColumn = table === 'purity_tests' ? 'pure_seed_weight' : table === 'viability_tests' ? 'viable_count' : 'germinated_count';

  const result = await pool.query<CropVarietyRateRow>(
    `SELECT sl.crop, sl.variety, SUM(t.${sampleColumn}) AS total_sample, SUM(t.${successColumn}) AS total_success, COUNT(*) AS test_count
     FROM ${table} t
     JOIN seed_lots sl ON sl.id = t.seed_lot_id
     GROUP BY sl.crop, sl.variety`,
  );

  const map = new Map<string, { averagePercent: number | null; testCount: number }>();
  for (const row of result.rows) {
    const totalSample = Number(row.total_sample ?? 0);
    const totalSuccess = Number(row.total_success ?? 0);
    map.set(`${row.crop}::${row.variety}`, {
      averagePercent: totalSample > 0 ? Math.round((totalSuccess / totalSample) * 1000) / 10 : null,
      testCount: Number(row.test_count),
    });
  }
  return map;
}

async function buildQualityReport(): Promise<QualityReportEntry[]> {
  const [groupsResult, purityByVariety, viabilityByVariety, germinationByVariety] = await Promise.all([
    pool.query<{ crop: string; variety: string; lot_count: string }>(
      `SELECT crop, variety, COUNT(*) AS lot_count FROM seed_lots GROUP BY crop, variety ORDER BY crop ASC, variety ASC`,
    ),
    queryRateByVariety('purity_tests'),
    queryRateByVariety('viability_tests'),
    queryRateByVariety('germination_tests'),
  ]);

  const empty = { averagePercent: null, testCount: 0 };
  return groupsResult.rows.map((group) => {
    const key = `${group.crop}::${group.variety}`;
    return {
      crop: group.crop,
      variety: group.variety,
      lotCount: Number(group.lot_count),
      germination: germinationByVariety.get(key) ?? empty,
      purity: purityByVariety.get(key) ?? empty,
      viability: viabilityByVariety.get(key) ?? empty,
    };
  });
}

export async function generateGovernmentReport(
  reportType: string,
  cropYear: number | undefined,
  user: AuthenticatedUser,
): Promise<GovernmentReportRow> {
  if (!(GOVERNMENT_REPORT_TYPES as readonly string[]).includes(reportType)) {
    throw new ValidationError(`reportType must be one of: ${GOVERNMENT_REPORT_TYPES.join(', ')}`);
  }

  const snapshot =
    reportType === 'production'
      ? await buildProductionReport(cropYear)
      : reportType === 'distribution'
        ? await buildDistributionReport()
        : await buildQualityReport();

  const result = await pool.query<GovernmentReportRow>(
    `INSERT INTO government_reports (report_type, crop_year, snapshot, generated_by)
     VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
    [reportType, cropYear ?? null, JSON.stringify(snapshot), user.email],
  );
  return result.rows[0];
}

export async function listGovernmentReports(reportType?: string): Promise<GovernmentReportRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (reportType) {
    if (!(GOVERNMENT_REPORT_TYPES as readonly string[]).includes(reportType)) {
      throw new ValidationError(`reportType must be one of: ${GOVERNMENT_REPORT_TYPES.join(', ')}`);
    }
    values.push(reportType);
    conditions.push(`report_type = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<GovernmentReportRow>(
    `SELECT * FROM government_reports ${whereClause} ORDER BY generated_at DESC LIMIT 50`,
    values,
  );
  return result.rows;
}

export async function getGovernmentReport(id: string): Promise<GovernmentReportRow> {
  const result = await pool.query<GovernmentReportRow>('SELECT * FROM government_reports WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Government report ${id} not found`);
  return row;
}
