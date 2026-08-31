import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { listCropInsuranceRecords } from '../marketIntelligence/marketIntelligence.service';
import { computeAccruedInterest, computeAmountDue } from './financingCalculations';
import {
  FINANCING_TYPES,
  type FinancingAccountRow,
  type FinancingCostSummary,
  type FinancingStatus,
  type InsuranceContext,
  type RecordRepaymentInput,
  type RequestFinancingInput,
} from './financing.types';

// Requesting financing is open to whoever manages the relevant
// relationship (mirrors seedRequests/subsidy-claims' create-role set).
// Approval, disbursement, recording an actual repayment, and marking a
// default are all Admin-only — this app's established "real financial
// commitment" trust level (createOrganization, partner-link approval,
// subsidy claim payment all use the same bar).
export const FINANCING_REQUEST_ROLES = ['Admin', 'Breeder', 'Producer', 'Warehouse Manager'];

const REPAYMENT_GRACE_PERIOD_DAYS = 30;

function assertAdmin(user: AuthenticatedUser, action: string): void {
  if (user.role !== 'Admin') {
    throw new ForbiddenError(`Only Admin can ${action}`);
  }
}

export async function requestFinancing(input: RequestFinancingInput, user: AuthenticatedUser): Promise<FinancingAccountRow> {
  if (!(FINANCING_TYPES as readonly string[]).includes(input.financingType)) {
    throw new ValidationError(`financingType must be one of: ${FINANCING_TYPES.join(', ')}`);
  }
  if (!Number.isFinite(input.principalAmount) || input.principalAmount <= 0) {
    throw new ValidationError('principalAmount must be a positive number');
  }
  if (!Number.isFinite(input.annualInterestRatePercent) || input.annualInterestRatePercent < 0) {
    throw new ValidationError('annualInterestRatePercent must be a non-negative number');
  }

  if (input.financingType === 'farmer_microfinance') {
    if (!input.borrowerFarmerId) throw new ValidationError('borrowerFarmerId is required for farmer_microfinance');
    if (input.borrowerOrganizationId) throw new ValidationError('borrowerOrganizationId must not be set for farmer_microfinance');
  } else {
    if (!input.borrowerOrganizationId) throw new ValidationError(`borrowerOrganizationId is required for ${input.financingType}`);
    if (input.borrowerFarmerId) throw new ValidationError(`borrowerFarmerId must not be set for ${input.financingType}`);
  }

  if (input.financingType === 'warehouse_receivables') {
    if (!input.receivableAmount || input.receivableAmount < input.principalAmount) {
      throw new ValidationError('receivableAmount is required for warehouse_receivables and must be at least the principal amount');
    }
  } else if (input.receivableAmount !== undefined) {
    throw new ValidationError('receivableAmount only applies to warehouse_receivables');
  }

  return withTransaction(async (client) => {
    const result = await client.query<FinancingAccountRow>(
      `INSERT INTO financing_accounts
         (financing_type, borrower_organization_id, borrower_farmer_id, seed_lot_id, allocation_id, principal_amount, annual_interest_rate_percent, receivable_amount, linked_insurance_crop, linked_insurance_season, requested_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        input.financingType,
        input.borrowerOrganizationId ?? null,
        input.borrowerFarmerId ?? null,
        input.seedLotId ?? null,
        input.allocationId ?? null,
        input.principalAmount,
        input.annualInterestRatePercent,
        input.receivableAmount ?? null,
        input.linkedInsuranceCrop?.trim() || null,
        input.linkedInsuranceSeason?.trim() || null,
        user.email,
        input.notes ?? null,
      ],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'financing_account',
      entityId: row.id,
      action: 'REQUEST',
      performedBy: user.email,
      afterState: row,
    });
    return row;
  });
}

async function transitionFinancingStatus(
  id: string,
  fromStatuses: FinancingStatus[],
  toStatus: FinancingStatus,
  user: AuthenticatedUser,
  action: string,
  extraSql?: { columns: string[]; values: unknown[] },
): Promise<FinancingAccountRow> {
  return withTransaction(async (client) => {
    const existingResult = await client.query<FinancingAccountRow>('SELECT * FROM financing_accounts WHERE id = $1 FOR UPDATE', [id]);
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Financing account ${id} not found`);
    if (!fromStatuses.includes(existing.status)) {
      throw new ConflictError(`Financing account is "${existing.status}" — expected one of: ${fromStatuses.join(', ')}`);
    }

    const setClauses = ['status = $1', 'updated_at = now()'];
    const values: unknown[] = [toStatus];
    if (extraSql) {
      for (let i = 0; i < extraSql.columns.length; i++) {
        values.push(extraSql.values[i]);
        setClauses.push(`${extraSql.columns[i]} = $${values.length}`);
      }
    }
    values.push(id);

    const result = await client.query<FinancingAccountRow>(
      `UPDATE financing_accounts SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'financing_account',
      entityId: id,
      action,
      performedBy: user.email,
      beforeState: { status: existing.status },
      afterState: { status: row.status },
    });

    return row;
  });
}

export async function approveFinancing(id: string, user: AuthenticatedUser): Promise<FinancingAccountRow> {
  assertAdmin(user, 'approve financing');
  return transitionFinancingStatus(id, ['requested'], 'approved', user, 'APPROVE', {
    columns: ['approved_by', 'approved_at'],
    values: [user.email, new Date().toISOString()],
  });
}

export async function rejectFinancing(id: string, reason: string, user: AuthenticatedUser): Promise<FinancingAccountRow> {
  assertAdmin(user, 'reject financing');
  if (!reason?.trim()) throw new ValidationError('A rejection reason is required');
  return transitionFinancingStatus(id, ['requested'], 'rejected', user, 'REJECT', {
    columns: ['rejection_reason'],
    values: [reason.trim()],
  });
}

export async function disburseFinancing(id: string, user: AuthenticatedUser): Promise<FinancingAccountRow> {
  assertAdmin(user, 'disburse financing');
  return transitionFinancingStatus(id, ['approved'], 'disbursed', user, 'DISBURSE', {
    columns: ['disbursed_at'],
    values: [new Date().toISOString()],
  });
}

/**
 * "Automated" here means the system automatically computes what's owed and
 * automatically moves the account into repayment the moment a harvest is
 * confirmed on record — there's no background job/cron infrastructure
 * anywhere in this app (and harvest_yields has no completion-date column to
 * hook one off even if there were), so a staff member initiates the check;
 * everything after that (verifying a harvest exists, computing accrued
 * interest, setting the due date) is deterministic and automatic, not a
 * manual calculation.
 */
export async function triggerPostHarvestRepayment(id: string, user: AuthenticatedUser): Promise<FinancingAccountRow> {
  const account = await getFinancingAccount(id);
  if (!FINANCING_REQUEST_ROLES.includes(user.role)) {
    throw new ForbiddenError(`Only ${FINANCING_REQUEST_ROLES.join(', ')} can trigger post-harvest repayment`);
  }
  if (account.status !== 'disbursed') {
    throw new ConflictError(`Financing account is "${account.status}" — expected "disbursed" before repayment can be triggered`);
  }
  if (!account.seed_lot_id) {
    throw new ConflictError('This financing account has no linked seed lot — post-harvest repayment cannot be verified');
  }

  const harvestResult = await pool.query('SELECT 1 FROM harvest_yields WHERE seed_lot_id = $1 LIMIT 1', [account.seed_lot_id]);
  if (!harvestResult.rows[0]) {
    throw new ConflictError('No harvest has been recorded yet for the financed seed lot');
  }

  const disbursedAt = new Date(account.disbursed_at!);
  const now = new Date();
  const accruedInterest = computeAccruedInterest(account.principal_amount, account.annual_interest_rate_percent, disbursedAt, now);
  const amountDue = computeAmountDue(account.principal_amount, accruedInterest);
  const dueDate = new Date(now.getTime() + REPAYMENT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return transitionFinancingStatus(id, ['disbursed'], 'repaying', user, 'TRIGGER_REPAYMENT', {
    columns: ['amount_due', 'repayment_due_date'],
    values: [amountDue, dueDate],
  });
}

export async function recordRepayment(id: string, input: RecordRepaymentInput, user: AuthenticatedUser): Promise<FinancingAccountRow> {
  assertAdmin(user, 'record a repayment');
  if (!Number.isFinite(input.repaidAmount) || input.repaidAmount <= 0) {
    throw new ValidationError('repaidAmount must be a positive number');
  }
  if (!input.paymentReference?.trim()) throw new ValidationError('paymentReference is required');

  return transitionFinancingStatus(id, ['repaying'], 'repaid', user, 'REPAY', {
    columns: ['repaid_at', 'repaid_amount', 'payment_reference'],
    values: [new Date().toISOString(), input.repaidAmount, input.paymentReference.trim()],
  });
}

export async function markFinancingDefaulted(id: string, reason: string, user: AuthenticatedUser): Promise<FinancingAccountRow> {
  assertAdmin(user, 'mark a financing account as defaulted');
  if (!reason?.trim()) throw new ValidationError('A default reason is required');
  return transitionFinancingStatus(id, ['disbursed', 'repaying'], 'defaulted', user, 'DEFAULT', {
    columns: ['defaulted_at', 'default_reason'],
    values: [new Date().toISOString(), reason.trim()],
  });
}

export async function listFinancingAccounts(filters: {
  financingType?: string;
  borrowerOrganizationId?: string;
  borrowerFarmerId?: string;
  seedLotId?: string;
  allocationId?: string;
  status?: string;
} = {}): Promise<FinancingAccountRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  for (const [column, value] of [
    ['financing_type', filters.financingType],
    ['borrower_organization_id', filters.borrowerOrganizationId],
    ['borrower_farmer_id', filters.borrowerFarmerId],
    ['seed_lot_id', filters.seedLotId],
    ['allocation_id', filters.allocationId],
    ['status', filters.status],
  ] as const) {
    if (value) {
      values.push(value);
      conditions.push(`${column} = $${values.length}`);
    }
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<FinancingAccountRow>(
    `SELECT * FROM financing_accounts ${whereClause} ORDER BY created_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

export async function getFinancingAccount(id: string): Promise<FinancingAccountRow> {
  const result = await pool.query<FinancingAccountRow>('SELECT * FROM financing_accounts WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Financing account ${id} not found`);
  return row;
}

/** Live-computed, like storage's accrued cost — never stored, so it's always current as of the moment it's read. */
export async function getAccruedInterest(id: string): Promise<{ accruedInterest: number; asOf: string }> {
  const account = await getFinancingAccount(id);
  if (!account.disbursed_at) {
    return { accruedInterest: 0, asOf: new Date().toISOString() };
  }
  const endDate = account.repaid_at ? new Date(account.repaid_at) : new Date();
  const accruedInterest = computeAccruedInterest(account.principal_amount, account.annual_interest_rate_percent, new Date(account.disbursed_at), endDate);
  return { accruedInterest, asOf: endDate.toISOString() };
}

/** "Track financing flows through seed lot allocations" / "financing costs per lot" — every financing account tied to one lot, with live-computed accrued cost totals. */
export async function getFinancingCostsForLot(seedLotId: string): Promise<FinancingCostSummary> {
  const accounts = await listFinancingAccounts({ seedLotId });
  const activeAccounts = accounts.filter((a) => a.status === 'disbursed' || a.status === 'repaying' || a.status === 'repaid');

  let totalPrincipal = 0;
  let totalAccruedInterest = 0;
  for (const account of activeAccounts) {
    totalPrincipal += Number(account.principal_amount);
    const { accruedInterest } = await getAccruedInterest(account.id);
    totalAccruedInterest += accruedInterest;
  }

  return {
    seedLotId,
    financingCount: accounts.length,
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    totalAccruedInterest: Math.round(totalAccruedInterest * 100) / 100,
    totalAmountDue: Math.round((totalPrincipal + totalAccruedInterest) * 100) / 100,
  };
}

/** Crop insurance integration — reads the EXISTING market-intelligence crop_insurance_records rather than a new insurance table, purely as risk context for a financing decision. */
export async function getInsuranceContext(crop: string, season?: string): Promise<InsuranceContext | null> {
  const records = await listCropInsuranceRecords({ crop });
  const matching = season ? records.filter((r) => r.season === season) : records;
  if (matching.length === 0) return null;

  return {
    crop,
    season: season ?? 'all seasons',
    claimsCount: matching.reduce((sum, r) => sum + r.claims_count, 0),
    totalClaimAmount: matching.reduce((sum, r) => sum + Number(r.total_claim_amount), 0),
    recordCount: matching.length,
  };
}
