import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { getQualityMetrics } from '../compliance/compliance.service';
import { getSeedLotById } from '../seedLots/seedLots.service';
import { computeGermplasmScore } from './germplasmScoring';
import { predictHybridVigor } from './hybridVigorPrediction';
import { computeTraitCorrelation, type TraitPair } from './traitCorrelation';
import type {
  BreedingCycleTimelineEntry,
  BreedingProgramRoiEntry,
  GermplasmPoolRanking,
  HybridCrossPredictionRow,
  LineageSummaryEntry,
  LotTraitMeasurementRow,
  PredictHybridCrossInput,
  RecordActualCrossOutcomeInput,
  RecordTraitMeasurementInput,
  TraitInheritanceReport,
} from './breedingAnalytics.types';

// Recording breeding data (trait measurements, hybrid-cross predictions) is
// gated the same way varieties.ts's COMMITTEE_ROLES and market
// intelligence's MARKET_DATA_ROLES are — Admin/Breeder, this app's existing
// breeding-judgment authority, rather than a new role.
export const BREEDING_DATA_ROLES = ['Admin', 'Breeder'];

// Deliberately NOT querying mv_seed_lot_genealogy (migration 034): that
// view is precomputed for every lot in the whole table at once, which
// means (a) a freshly created lot is invisible here until the next
// REFRESH MATERIALIZED VIEW, and (b) that refresh recomputes the ENTIRE
// tree and gets slower as the whole table grows, regardless of how small
// any one lineage actually is. Since every query here only ever needs ONE
// lineage's descendants/root, a live recursive CTE scoped to that lineage
// is both always up to date and bounded by that lineage's own size, not
// the size of the whole seed_lots table.
async function fetchDescendantIds(rootId: string): Promise<string[]> {
  const result = await pool.query<{ id: string }>(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM seed_lots WHERE parent_lot_id = $1
       UNION ALL
       SELECT sl.id FROM seed_lots sl JOIN descendants d ON sl.parent_lot_id = d.id
     )
     SELECT id FROM descendants`,
    [rootId],
  );
  return result.rows.map((r) => r.id);
}

/** Walks up the parent chain to find the root (parent_lot_id IS NULL) of whichever lineage this lot belongs to — a root lot's own root is itself. */
async function getLineageRootId(seedLotId: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `WITH RECURSIVE ancestors AS (
       SELECT id, parent_lot_id FROM seed_lots WHERE id = $1
       UNION ALL
       SELECT sl.id, sl.parent_lot_id FROM seed_lots sl JOIN ancestors a ON sl.id = a.parent_lot_id
     )
     SELECT id FROM ancestors WHERE parent_lot_id IS NULL LIMIT 1`,
    [seedLotId],
  );
  return result.rows[0]?.id ?? seedLotId;
}

// Every report below processes each root lineage with its own handful of
// DB round trips (descendant traversal, quality metrics, etc.) — cheap for
// a caller-specified set of roots, but a system that's been running a long
// time can accumulate thousands of historical root lots, and looping every
// one of them turns a dashboard query into tens of thousands of round
// trips. The unfiltered case is bounded to the most recently established
// lineages — a "germplasm pool rankings" dashboard cares about current/
// active breeding programs, not a full unbounded historical archive —
// while an explicit rootLotIds filter is always honored in full.
const UNFILTERED_ROOT_LOT_LIMIT = 50;

async function listRootBreederLotIds(explicitIds?: string[]): Promise<string[]> {
  if (explicitIds && explicitIds.length > 0) return explicitIds;
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM seed_lots WHERE parent_lot_id IS NULL AND stage = 'Breeder' ORDER BY created_at DESC LIMIT $1`,
    [UNFILTERED_ROOT_LOT_LIMIT],
  );
  return result.rows.map((r) => r.id);
}

// --- Trait measurements --------------------------------------------------

export async function recordTraitMeasurement(input: RecordTraitMeasurementInput, user: AuthenticatedUser): Promise<LotTraitMeasurementRow> {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!input.traitType?.trim()) throw new ValidationError('traitType is required');
  if (!input.measuredDate) throw new ValidationError('measuredDate is required');
  const hasNumeric = input.numericValue !== undefined;
  const hasCategory = !!input.categoryValue?.trim();
  if (hasNumeric === hasCategory) {
    throw new ValidationError('Provide exactly one of numericValue or categoryValue');
  }
  await getSeedLotById(input.seedLotId); // 404s if the lot doesn't exist

  return withTransaction(async (client) => {
    const result = await client.query<LotTraitMeasurementRow>(
      `INSERT INTO lot_trait_measurements (seed_lot_id, trait_type, numeric_value, category_value, unit, measured_date, recorded_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        input.seedLotId,
        input.traitType.trim(),
        input.numericValue ?? null,
        input.categoryValue?.trim() || null,
        input.unit ?? null,
        input.measuredDate,
        user.email,
        input.notes ?? null,
      ],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'lot_trait_measurement',
      entityId: row.id,
      action: 'RECORD',
      performedBy: user.email,
      afterState: row,
      metadata: { seedLotId: input.seedLotId, traitType: row.trait_type },
    });
    return row;
  });
}

export async function listTraitMeasurementsForLot(seedLotId: string): Promise<LotTraitMeasurementRow[]> {
  const result = await pool.query<LotTraitMeasurementRow>(
    'SELECT * FROM lot_trait_measurements WHERE seed_lot_id = $1 ORDER BY measured_date DESC',
    [seedLotId],
  );
  return result.rows;
}

async function latestNumericTrait(seedLotId: string, traitType: string): Promise<number | null> {
  const result = await pool.query<{ numeric_value: number }>(
    `SELECT numeric_value FROM lot_trait_measurements
     WHERE seed_lot_id = $1 AND trait_type = $2 AND numeric_value IS NOT NULL
     ORDER BY measured_date DESC LIMIT 1`,
    [seedLotId, traitType],
  );
  return result.rows[0] ? Number(result.rows[0].numeric_value) : null;
}

// --- Lineage across multiple breeder lots --------------------------------

export async function getLineageSummary(rootLotIds?: string[]): Promise<LineageSummaryEntry[]> {
  const roots = await listRootBreederLotIds(rootLotIds);
  if (roots.length === 0) return [];

  const rootLotsResult = await pool.query(`SELECT * FROM seed_lots WHERE id = ANY($1)`, [roots]);
  const rootLots = new Map(rootLotsResult.rows.map((l) => [l.id, l]));

  const entries = await Promise.all(
    roots.map(async (rootId) => {
      const root = rootLots.get(rootId);
      if (!root) return null;
      const descendantIds = await fetchDescendantIds(rootId);
      if (descendantIds.length === 0) {
        return {
          rootLotId: rootId,
          rootLotCode: root.lot_code,
          crop: root.crop,
          variety: root.variety,
          descendantCount: 0,
          foundationLotCount: 0,
          certifiedLotCount: 0,
          totalDescendantQuantity: 0,
          unit: root.unit,
        };
      }

      const descendantsResult = await pool.query(`SELECT stage, quantity_total FROM seed_lots WHERE id = ANY($1)`, [descendantIds]);
      const foundationLotCount = descendantsResult.rows.filter((r) => r.stage === 'Foundation').length;
      const certifiedLotCount = descendantsResult.rows.filter((r) => r.stage === 'Certified').length;
      const totalDescendantQuantity = descendantsResult.rows.reduce((sum, r) => sum + Number(r.quantity_total), 0);

      return {
        rootLotId: rootId,
        rootLotCode: root.lot_code,
        crop: root.crop,
        variety: root.variety,
        descendantCount: descendantIds.length,
        foundationLotCount,
        certifiedLotCount,
        totalDescendantQuantity: Math.round(totalDescendantQuantity * 100) / 100,
        unit: root.unit,
      };
    }),
  );

  return entries.filter((e): e is LineageSummaryEntry => e !== null);
}

// --- Trait inheritance patterns -------------------------------------------

/**
 * Every seed_lots row with a parent that has a measurement for `traitType`
 * AND a measurement of its own for the same trait becomes one data point —
 * handed to the pure Pearson-correlation function. Real statistics over
 * real recorded measurements, not a fabricated "genetics" claim.
 */
export async function analyzeTraitInheritance(traitType: string): Promise<TraitInheritanceReport> {
  if (!traitType?.trim()) throw new ValidationError('traitType is required');

  const result = await pool.query<{
    parent_lot_code: string;
    child_lot_code: string;
    parent_value: number;
    child_value: number;
  }>(
    `SELECT DISTINCT ON (child.id)
       parent.lot_code AS parent_lot_code,
       child.lot_code AS child_lot_code,
       pm.numeric_value AS parent_value,
       cm.numeric_value AS child_value
     FROM seed_lots child
     JOIN seed_lots parent ON parent.id = child.parent_lot_id
     JOIN LATERAL (
       SELECT numeric_value FROM lot_trait_measurements
       WHERE seed_lot_id = parent.id AND trait_type = $1 AND numeric_value IS NOT NULL
       ORDER BY measured_date DESC LIMIT 1
     ) pm ON true
     JOIN LATERAL (
       SELECT numeric_value FROM lot_trait_measurements
       WHERE seed_lot_id = child.id AND trait_type = $1 AND numeric_value IS NOT NULL
       ORDER BY measured_date DESC LIMIT 1
     ) cm ON true
     ORDER BY child.id`,
    [traitType.trim()],
  );

  const pairs: TraitPair[] = result.rows.map((r) => ({ parentValue: Number(r.parent_value), childValue: Number(r.child_value) }));
  const { correlation, sampleSize, strength } = computeTraitCorrelation(pairs);

  return {
    traitType: traitType.trim(),
    correlation,
    sampleSize,
    strength,
    pairs: result.rows.map((r) => ({
      parentLotCode: r.parent_lot_code,
      childLotCode: r.child_lot_code,
      parentValue: Number(r.parent_value),
      childValue: Number(r.child_value),
    })),
  };
}

// --- Superior germplasm pools ----------------------------------------------

export async function getGermplasmPoolRankings(): Promise<GermplasmPoolRanking[]> {
  const lineages = await getLineageSummary();

  const ranked = await Promise.all(
    lineages.map(async (lineage) => {
      const rootResult = await pool.query('SELECT quantity_total FROM seed_lots WHERE id = $1', [lineage.rootLotId]);
      const rootQuantity = Number(rootResult.rows[0]?.quantity_total ?? 0);

      let avgGerminationPercent: number | null = null;
      if (lineage.certifiedLotCount > 0) {
        const descendantIds = await fetchDescendantIds(lineage.rootLotId);
        const certifiedIdsResult = await pool.query<{ id: string }>(
          `SELECT id FROM seed_lots WHERE id = ANY($1) AND stage = 'Certified'`,
          [descendantIds],
        );
        const metrics = await Promise.all(certifiedIdsResult.rows.map((r) => getQualityMetrics(r.id)));
        const withTests = metrics.map((m) => m.germination).filter((g) => g.testCount > 0);
        if (withTests.length > 0) {
          const totalTests = withTests.reduce((sum, g) => sum + g.testCount, 0);
          const weightedSum = withTests.reduce((sum, g) => sum + (g.averagePercent ?? 0) * g.testCount, 0);
          avgGerminationPercent = Math.round((weightedSum / totalTests) * 10) / 10;
        }
      }

      const multiplicationRatio = rootQuantity > 0 && lineage.descendantCount > 0 ? lineage.totalDescendantQuantity / rootQuantity : null;

      const { score, breakdown } = computeGermplasmScore({
        avgGerminationPercent,
        multiplicationRatio,
        descendantCount: lineage.descendantCount > 0 ? lineage.descendantCount : null,
      });

      return {
        rootLotId: lineage.rootLotId,
        rootLotCode: lineage.rootLotCode,
        crop: lineage.crop,
        variety: lineage.variety,
        score,
        breakdown,
      };
    }),
  );

  return ranked.sort((a, b) => b.score - a.score);
}

// --- Breeding cycle timelines ----------------------------------------------

export async function getBreedingCycleTimelines(rootLotIds?: string[]): Promise<BreedingCycleTimelineEntry[]> {
  const roots = await listRootBreederLotIds(rootLotIds);
  if (roots.length === 0) return [];

  const rootLotsResult = await pool.query('SELECT id, lot_code, production_date FROM seed_lots WHERE id = ANY($1)', [roots]);
  const rootLots = new Map(rootLotsResult.rows.map((l) => [l.id, l]));

  const entries: BreedingCycleTimelineEntry[] = [];
  for (const rootId of roots) {
    const root = rootLots.get(rootId);
    if (!root) continue;
    const descendantIds = await fetchDescendantIds(rootId);
    if (descendantIds.length === 0) continue;

    const descendantsResult = await pool.query(
      'SELECT id, lot_code, stage, production_date FROM seed_lots WHERE id = ANY($1) AND stage != $2',
      [descendantIds, 'Breeder'],
    );
    for (const descendant of descendantsResult.rows) {
      const daysFromRoot = Math.round(
        (new Date(descendant.production_date).getTime() - new Date(root.production_date).getTime()) / (1000 * 60 * 60 * 24),
      );
      entries.push({
        rootLotId: rootId,
        rootLotCode: root.lot_code,
        descendantLotId: descendant.id,
        descendantLotCode: descendant.lot_code,
        descendantStage: descendant.stage,
        daysFromRoot,
      });
    }
  }

  return entries.sort((a, b) => a.daysFromRoot - b.daysFromRoot);
}

// --- Breeding program ROI (yield-based, not monetary) ----------------------

/**
 * "ROI" here is a yield-multiplication ratio (Foundation-stage quantity
 * achieved per unit of Breeder-stage seed the program started from), NOT a
 * dollar figure — there is no cost/budget concept anywhere in this app for
 * a breeding program, so a fabricated currency return would be dishonest.
 * Returns null (not a made-up number) when the root has no recorded
 * quantity to divide by.
 */
export async function getBreedingProgramRoi(rootLotIds?: string[]): Promise<BreedingProgramRoiEntry[]> {
  const roots = await listRootBreederLotIds(rootLotIds);
  if (roots.length === 0) return [];

  const rootLotsResult = await pool.query('SELECT * FROM seed_lots WHERE id = ANY($1)', [roots]);
  const rootLots = new Map(rootLotsResult.rows.map((l) => [l.id, l]));

  const entries = await Promise.all(
    roots.map(async (rootId) => {
      const root = rootLots.get(rootId);
      if (!root) return null;
      const descendantIds = await fetchDescendantIds(rootId);

      let foundationYieldAchieved = 0;
      if (descendantIds.length > 0) {
        const foundationResult = await pool.query<{ total: string | null }>(
          `SELECT SUM(quantity_total) AS total FROM seed_lots WHERE id = ANY($1) AND stage = 'Foundation'`,
          [descendantIds],
        );
        foundationYieldAchieved = Number(foundationResult.rows[0]?.total ?? 0);
      }

      const breederStageQuantity = Number(root.quantity_total);
      const yieldMultiplicationRoi = breederStageQuantity > 0 ? Math.round((foundationYieldAchieved / breederStageQuantity) * 100) / 100 : null;

      return {
        rootLotId: rootId,
        rootLotCode: root.lot_code,
        crop: root.crop,
        variety: root.variety,
        breederStageQuantity,
        foundationYieldAchieved: Math.round(foundationYieldAchieved * 100) / 100,
        unit: root.unit,
        yieldMultiplicationRoi,
      };
    }),
  );

  return entries.filter((e): e is BreedingProgramRoiEntry => e !== null).sort((a, b) => (b.yieldMultiplicationRoi ?? -1) - (a.yieldMultiplicationRoi ?? -1));
}

// --- Hybrid vigor prediction ------------------------------------------------

export async function predictHybridCrossVigor(input: PredictHybridCrossInput, user: AuthenticatedUser): Promise<HybridCrossPredictionRow> {
  if (!input.parentALotId || !input.parentBLotId) throw new ValidationError('parentALotId and parentBLotId are required');
  if (input.parentALotId === input.parentBLotId) throw new ValidationError('A lot cannot be crossed with itself');
  if (!input.traitType?.trim()) throw new ValidationError('traitType is required');
  const traitType = input.traitType.trim();

  await getSeedLotById(input.parentALotId);
  await getSeedLotById(input.parentBLotId);

  const [parentAValue, parentBValue] = await Promise.all([
    latestNumericTrait(input.parentALotId, traitType),
    latestNumericTrait(input.parentBLotId, traitType),
  ]);
  if (parentAValue === null || parentBValue === null) {
    throw new ConflictError(`Both parent lots need a recorded numeric measurement for trait "${traitType}" before predicting a cross`);
  }

  const [rootA, rootB] = await Promise.all([getLineageRootId(input.parentALotId), getLineageRootId(input.parentBLotId)]);
  const sameLineage = rootA === rootB;

  const historicalResult = await pool.query<{ avg_realized_heterosis: string | null }>(
    `SELECT AVG((actual_trait_value - mid_parent_value) / NULLIF(mid_parent_value, 0) * 100) AS avg_realized_heterosis
     FROM hybrid_cross_predictions
     WHERE trait_type = $1 AND same_lineage = $2 AND actual_trait_value IS NOT NULL`,
    [traitType, sameLineage],
  );
  const historicalAvgHeterosisPercent =
    historicalResult.rows[0]?.avg_realized_heterosis != null ? Number(historicalResult.rows[0].avg_realized_heterosis) : null;

  const prediction = predictHybridVigor({
    parentATraitValue: parentAValue,
    parentBTraitValue: parentBValue,
    sameLineage,
    historicalAvgHeterosisPercent,
  });

  return withTransaction(async (client) => {
    const result = await client.query<HybridCrossPredictionRow>(
      `INSERT INTO hybrid_cross_predictions
         (parent_a_lot_id, parent_b_lot_id, trait_type, mid_parent_value, same_lineage, predicted_heterosis_percent, predicted_vigor_score, signals_breakdown, predicted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9) RETURNING *`,
      [
        input.parentALotId,
        input.parentBLotId,
        traitType,
        prediction.midParentValue,
        sameLineage,
        prediction.heterosisPercent,
        prediction.predictedVigorScore,
        JSON.stringify(prediction.breakdown),
        user.email,
      ],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'hybrid_cross_prediction',
      entityId: row.id,
      action: 'PREDICT',
      performedBy: user.email,
      afterState: row,
    });
    return row;
  });
}

export async function recordActualCrossOutcome(
  predictionId: string,
  input: RecordActualCrossOutcomeInput,
  user: AuthenticatedUser,
): Promise<HybridCrossPredictionRow> {
  if (!input.actualChildLotId) throw new ValidationError('actualChildLotId is required');
  if (!Number.isFinite(Number(input.actualTraitValue))) throw new ValidationError('actualTraitValue must be a number');
  await getSeedLotById(input.actualChildLotId);

  return withTransaction(async (client) => {
    const existingResult = await client.query<HybridCrossPredictionRow>(
      'SELECT * FROM hybrid_cross_predictions WHERE id = $1 FOR UPDATE',
      [predictionId],
    );
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Hybrid cross prediction ${predictionId} not found`);
    if (existing.actual_child_lot_id) {
      throw new ConflictError('This prediction already has a recorded actual outcome');
    }

    const result = await client.query<HybridCrossPredictionRow>(
      `UPDATE hybrid_cross_predictions SET actual_child_lot_id = $1, actual_trait_value = $2 WHERE id = $3 RETURNING *`,
      [input.actualChildLotId, input.actualTraitValue, predictionId],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'hybrid_cross_prediction',
      entityId: predictionId,
      action: 'RECORD_ACTUAL_OUTCOME',
      performedBy: user.email,
      afterState: { actualChildLotId: input.actualChildLotId, actualTraitValue: input.actualTraitValue },
    });
    return row;
  });
}

export async function listHybridCrossPredictions(filters: { lotId?: string; traitType?: string } = {}): Promise<HybridCrossPredictionRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.lotId) {
    values.push(filters.lotId);
    conditions.push(`(parent_a_lot_id = $${values.length} OR parent_b_lot_id = $${values.length})`);
  }
  if (filters.traitType) {
    values.push(filters.traitType);
    conditions.push(`trait_type = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<HybridCrossPredictionRow>(
    `SELECT * FROM hybrid_cross_predictions ${whereClause} ORDER BY predicted_at DESC`,
    values,
  );
  return result.rows;
}

export async function getHybridCrossPrediction(id: string): Promise<HybridCrossPredictionRow> {
  const result = await pool.query<HybridCrossPredictionRow>('SELECT * FROM hybrid_cross_predictions WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Hybrid cross prediction ${id} not found`);
  return row;
}
