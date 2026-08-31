import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type {
  BreedingEffectivenessEntry,
  GerminationRateEntry,
  GerminationTestInput,
  HarvestYieldInput,
  ProductionAnalyticsDashboard,
  UtilizationEntry,
  YieldOutcomeEntry,
} from './analytics.types';

export async function getUtilization(): Promise<UtilizationEntry[]> {
  const result = await pool.query(
    `SELECT id, lot_code, crop, stage, quantity_total, quantity_allocated
     FROM seed_lots
     WHERE quantity_total > 0
     ORDER BY crop, lot_code`,
  );
  return result.rows.map((row) => ({
    seedLotId: row.id,
    lotCode: row.lot_code,
    crop: row.crop,
    stage: row.stage,
    quantityTotal: Number(row.quantity_total),
    quantityAllocated: Number(row.quantity_allocated),
    quantityAvailable: Number(row.quantity_total) - Number(row.quantity_allocated),
    utilizationPercent: Math.round((Number(row.quantity_allocated) / Number(row.quantity_total)) * 1000) / 10,
  }));
}

export async function getYieldOutcomes(): Promise<YieldOutcomeEntry[]> {
  const result = await pool.query(
    `SELECT sl.id AS seed_lot_id, sl.lot_code, sl.crop, hy.unit,
            SUM(hy.sown_quantity) AS total_sown,
            SUM(hy.harvested_quantity) AS total_harvested,
            COUNT(*) AS record_count
     FROM harvest_yields hy
     JOIN seed_lots sl ON sl.id = hy.seed_lot_id
     GROUP BY sl.id, sl.lot_code, sl.crop, hy.unit
     ORDER BY sl.lot_code`,
  );
  return result.rows.map((row) => {
    const totalSown = Number(row.total_sown);
    const totalHarvested = Number(row.total_harvested);
    return {
      seedLotId: row.seed_lot_id,
      lotCode: row.lot_code,
      crop: row.crop,
      totalSown,
      totalHarvested,
      yieldRatio: totalSown > 0 ? Math.round((totalHarvested / totalSown) * 100) / 100 : null,
      unit: row.unit,
      recordCount: Number(row.record_count),
    };
  });
}

export async function getGerminationRates(): Promise<GerminationRateEntry[]> {
  const result = await pool.query(
    `SELECT variety,
            SUM(sample_size) AS total_sample_size,
            SUM(germinated_count) AS total_germinated,
            COUNT(*) AS test_count
     FROM germination_tests
     GROUP BY variety
     ORDER BY variety`,
  );
  return result.rows.map((row) => {
    const totalSampleSize = Number(row.total_sample_size);
    const totalGerminated = Number(row.total_germinated);
    return {
      variety: row.variety,
      totalSampleSize,
      totalGerminated,
      germinationRatePercent: totalSampleSize > 0 ? Math.round((totalGerminated / totalSampleSize) * 1000) / 10 : 0,
      testCount: Number(row.test_count),
    };
  });
}

/**
 * For every lot with at least one child, the parent's quantity_allocated is
 * treated as the multiplication input and the sum of its direct children's
 * quantity_total as the output — a real ratio computed from existing
 * seed_lots/allocation data, no separate "yield" table needed for this one.
 */
export async function getBreedingEffectiveness(): Promise<BreedingEffectivenessEntry[]> {
  const result = await pool.query(
    `SELECT p.id AS parent_id, p.lot_code AS parent_lot_code, p.stage AS parent_stage, p.quantity_allocated,
            array_agg(c.lot_code ORDER BY c.lot_code) AS child_lot_codes,
            (array_agg(DISTINCT c.stage))[1] AS child_stage,
            SUM(c.quantity_total) AS children_quantity_total
     FROM seed_lots p
     JOIN seed_lots c ON c.parent_lot_id = p.id
     GROUP BY p.id, p.lot_code, p.stage, p.quantity_allocated
     ORDER BY p.lot_code`,
  );
  return result.rows.map((row) => {
    const parentQuantityAllocated = Number(row.quantity_allocated);
    const childrenQuantityTotal = Number(row.children_quantity_total);
    return {
      parentLotId: row.parent_id,
      parentLotCode: row.parent_lot_code,
      parentStage: row.parent_stage,
      childStage: row.child_stage,
      parentQuantityAllocated,
      childrenQuantityTotal,
      multiplicationRatio:
        parentQuantityAllocated > 0 ? Math.round((childrenQuantityTotal / parentQuantityAllocated) * 100) / 100 : null,
      childLotCodes: row.child_lot_codes,
    };
  });
}

export async function getDashboard(): Promise<ProductionAnalyticsDashboard> {
  const [utilization, yieldOutcomes, germinationRates, breedingEffectiveness] = await Promise.all([
    getUtilization(),
    getYieldOutcomes(),
    getGerminationRates(),
    getBreedingEffectiveness(),
  ]);
  return { utilization, yieldOutcomes, germinationRates, breedingEffectiveness };
}

export async function recordHarvestYield(input: HarvestYieldInput, user: AuthenticatedUser) {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!Number.isFinite(Number(input.sownQuantity)) || Number(input.sownQuantity) <= 0) {
    throw new ValidationError('sownQuantity must be a positive number');
  }
  if (!Number.isFinite(Number(input.harvestedQuantity)) || Number(input.harvestedQuantity) < 0) {
    throw new ValidationError('harvestedQuantity must be a non-negative number');
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO harvest_yields (seed_lot_id, crop_plan_id, sown_quantity, harvested_quantity, unit, recorded_by, notes)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'kg'), $6, $7)
       RETURNING *`,
      [
        input.seedLotId,
        input.cropPlanId ?? null,
        input.sownQuantity,
        input.harvestedQuantity,
        input.unit ?? null,
        user.email,
        input.notes ?? null,
      ],
    );
    const created = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'harvest_yield',
      entityId: created.id,
      action: 'RECORD_YIELD',
      performedBy: user.email,
      afterState: created,
      metadata: { seedLotId: input.seedLotId },
    });

    return created;
  });
}

export async function recordGerminationTest(input: GerminationTestInput, user: AuthenticatedUser) {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!Number.isInteger(Number(input.sampleSize)) || Number(input.sampleSize) <= 0) {
    throw new ValidationError('sampleSize must be a positive integer');
  }
  if (!Number.isInteger(Number(input.germinatedCount)) || Number(input.germinatedCount) < 0) {
    throw new ValidationError('germinatedCount must be a non-negative integer');
  }
  if (Number(input.germinatedCount) > Number(input.sampleSize)) {
    throw new ValidationError('germinatedCount cannot exceed sampleSize');
  }

  const lotResult = await pool.query('SELECT variety FROM seed_lots WHERE id = $1', [input.seedLotId]);
  const lot = lotResult.rows[0];
  if (!lot) throw new ValidationError(`Seed lot ${input.seedLotId} not found`);

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO germination_tests (seed_lot_id, variety, sample_size, germinated_count, tested_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.seedLotId, lot.variety, input.sampleSize, input.germinatedCount, user.email, input.notes ?? null],
    );
    const created = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'germination_test',
      entityId: created.id,
      action: 'RECORD_GERMINATION_TEST',
      performedBy: user.email,
      afterState: created,
      metadata: { seedLotId: input.seedLotId },
    });

    return created;
  });
}
