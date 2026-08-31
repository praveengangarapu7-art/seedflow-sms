import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { allocate, release } from '../allocations/allocations.service';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { getFarmer } from '../farmers/farmers.service';
import { listRatings } from '../performanceRatings/performanceRatings.service';
import { listVarieties } from '../varieties/varieties.service';
import { calculateSeedQuantity, getAgroAdvisory, getSuitableSoilsForCrop } from './cropPlanning.validation';
import {
  IRRIGATION_TYPES,
  SOIL_TYPES,
  type CreateCropPlanDraftInput,
  type CreateFarmInput,
  type CropHistoryCompatibility,
  type CropPlanWithContext,
  type Farm,
  type SeedLotRecommendation,
  type VarietyRecommendation,
} from './cropPlanning.types';

export { calculateSeedQuantity, getAgroAdvisory } from './cropPlanning.validation';

type Queryable = Pool | PoolClient;

function mapFarmRow(row: any): Farm {
  return {
    id: row.id,
    farmer_id: row.farmer_id,
    name: row.name,
    soil_type: row.soil_type,
    area_acres: Number(row.area_acres),
    irrigation_type: row.irrigation_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createFarm(input: CreateFarmInput): Promise<Farm> {
  if (!input.farmerId) throw new ValidationError('farmerId is required');
  if (!input.name?.trim()) throw new ValidationError('name is required');
  if (!SOIL_TYPES.includes(input.soilType)) {
    throw new ValidationError(`soilType must be one of: ${SOIL_TYPES.join(', ')}`);
  }
  if (!Number.isFinite(Number(input.areaAcres)) || Number(input.areaAcres) <= 0) {
    throw new ValidationError('areaAcres must be a positive number');
  }
  if (input.irrigationType && !IRRIGATION_TYPES.includes(input.irrigationType)) {
    throw new ValidationError(`irrigationType must be one of: ${IRRIGATION_TYPES.join(', ')}`);
  }

  await getFarmer(input.farmerId);

  const result = await pool.query(
    `INSERT INTO farms (farmer_id, name, soil_type, area_acres, irrigation_type)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.farmerId, input.name.trim(), input.soilType, input.areaAcres, input.irrigationType ?? null],
  );
  return mapFarmRow(result.rows[0]);
}

export async function listFarms(farmerId?: string): Promise<Farm[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (farmerId) {
    values.push(farmerId);
    conditions.push(`farmer_id = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`SELECT * FROM farms ${whereClause} ORDER BY name ASC`, values);
  return result.rows.map(mapFarmRow);
}

/**
 * "Compatibility with the farm's crop history" — draws on the farmer's real
 * seed-request history plus any of their own prior (non-cancelled) crop
 * plans, most recent first. A repeat of the same crop is flagged as a
 * caution (pest/disease buildup risk from continuous cropping), not blocked.
 */
export async function getCropHistoryCompatibility(farmerId: string, crop: string): Promise<CropHistoryCompatibility> {
  const result = await pool.query<{ crop: string }>(
    `SELECT crop, created_at FROM seed_requests WHERE farmer_id = $1
     UNION ALL
     SELECT crop, created_at FROM crop_plans WHERE farmer_id = $1 AND status <> 'cancelled'
     ORDER BY created_at DESC`,
    [farmerId],
  );
  const pastCrops = result.rows.map((r) => r.crop);
  const distinctRecent = Array.from(new Set(pastCrops)).slice(0, 5);

  if (pastCrops.length === 0) {
    return {
      status: 'no_history',
      message: 'No planting history on record for this farmer yet — this would be their first tracked crop.',
      pastCrops: [],
    };
  }
  if (pastCrops[0] === crop) {
    return {
      status: 'repeat_caution',
      message: `This farmer's last tracked crop was also ${crop} — repeating the same crop on the same land can build up soil-borne pests and disease; consider rotating if agronomically feasible.`,
      pastCrops: distinctRecent,
    };
  }
  return {
    status: 'rotation_ok',
    message: `Good rotation — this farmer's last tracked crop was ${pastCrops[0]}, different from ${crop}.`,
    pastCrops: distinctRecent,
  };
}

/**
 * Ranks approved, currently-issued varieties for this crop by: regional
 * suitability (real agro_climatic_suitability match against the farmer's
 * region), soil compatibility (crop-level suitable-soils heuristic against
 * the farm's soil_type), this farmer's own past ratings for that exact
 * variety (a real "past yields" signal), and yield benchmark / market trend
 * as tie-breakers.
 */
export async function getVarietyRecommendations(
  farmerId: string,
  farmId: string,
  crop: string,
): Promise<VarietyRecommendation[]> {
  if (!crop?.trim()) throw new ValidationError('crop is required');

  const farmer = await getFarmer(farmerId);
  const farmResult = await pool.query('SELECT * FROM farms WHERE id = $1 AND farmer_id = $2', [farmId, farmerId]);
  const farm = farmResult.rows[0];
  if (!farm) throw new NotFoundError(`Farm ${farmId} not found for this farmer`);

  const [varieties, ratings] = await Promise.all([
    listVarieties({ crop, status: 'approved' }),
    listRatings({ farmerId, crop }),
  ]);

  const ratingsByVariety = new Map<string, number[]>();
  for (const rating of ratings) {
    const list = ratingsByVariety.get(rating.variety) ?? [];
    list.push(rating.overall_rating);
    ratingsByVariety.set(rating.variety, list);
  }

  const suitableSoils = getSuitableSoilsForCrop(crop);

  return varieties
    .filter((variety) => variety.latestVersion && variety.latestVersion.status === 'issued')
    .map((variety) => {
      const version = variety.latestVersion!;
      const reasons: string[] = [];
      let score = 0;

      if (version.agro_climatic_suitability.includes(farmer.region)) {
        score += 40;
        reasons.push(`Suited to your region (${farmer.region})`);
      }

      if (suitableSoils.includes(farm.soil_type)) {
        score += 25;
        reasons.push(`${crop} suits ${farm.soil_type} soil, matching this farm`);
      }

      const pastRatings = ratingsByVariety.get(variety.variety_name);
      if (pastRatings && pastRatings.length > 0) {
        const avg = pastRatings.reduce((a, b) => a + b, 0) / pastRatings.length;
        score += (avg / 5) * 20;
        if (avg >= 4) reasons.push(`This farmer rated ${variety.variety_name} ${avg.toFixed(1)}/5 in past seasons`);
        else if (avg <= 2) reasons.push(`Caution — this farmer rated ${variety.variety_name} only ${avg.toFixed(1)}/5 previously`);
      }

      if (version.yield_benchmark_per_acre != null) {
        score += Math.min(15, version.yield_benchmark_per_acre / 100);
      }
      if (version.market_demand_trend === 'rising') {
        score += 5;
        reasons.push('Rising market demand');
      }

      return {
        varietyId: variety.id,
        varietyName: variety.variety_name,
        botanicalName: variety.botanical_name,
        yieldBenchmarkPerAcre: version.yield_benchmark_per_acre,
        yieldUnit: version.yield_unit,
        marketDemandTrend: version.market_demand_trend,
        score: Math.round(score * 10) / 10,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function mapCropPlanRow(row: any): CropPlanWithContext {
  return {
    id: row.id,
    farmer_id: row.farmer_id,
    farm_id: row.farm_id,
    crop: row.crop,
    variety_id: row.variety_id,
    target_area_acres: Number(row.target_area_acres),
    calculated_seed_quantity: Number(row.calculated_seed_quantity),
    seed_unit: row.seed_unit,
    sowing_date: row.sowing_date,
    seed_lot_id: row.seed_lot_id,
    allocation_id: row.allocation_id,
    status: row.status,
    recommendation_snapshot: row.recommendation_snapshot,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    farmer_name: row.farmer_name,
    farm_name: row.farm_name,
    variety_name: row.variety_name,
    lot_code: row.lot_code,
  };
}

async function buildCropPlanDetail(executor: Queryable, id: string): Promise<CropPlanWithContext> {
  const result = await executor.query(
    `SELECT cp.*, f.name AS farmer_name, fa.name AS farm_name, v.variety_name, sl.lot_code
     FROM crop_plans cp
     JOIN farmers f ON f.id = cp.farmer_id
     JOIN farms fa ON fa.id = cp.farm_id
     JOIN varieties v ON v.id = cp.variety_id
     LEFT JOIN seed_lots sl ON sl.id = cp.seed_lot_id
     WHERE cp.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Crop plan ${id} not found`);
  return mapCropPlanRow(row);
}

export async function createCropPlanDraft(
  input: CreateCropPlanDraftInput,
  user: AuthenticatedUser,
): Promise<CropPlanWithContext> {
  if (!input.farmerId) throw new ValidationError('farmerId is required');
  if (!input.farmId) throw new ValidationError('farmId is required');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.varietyId) throw new ValidationError('varietyId is required');
  if (!Number.isFinite(Number(input.targetAreaAcres)) || Number(input.targetAreaAcres) <= 0) {
    throw new ValidationError('targetAreaAcres must be a positive number');
  }
  const crop = input.crop.trim();

  const farmResult = await pool.query('SELECT id FROM farms WHERE id = $1 AND farmer_id = $2', [
    input.farmId,
    input.farmerId,
  ]);
  if (farmResult.rows.length === 0) throw new NotFoundError('Farm not found for this farmer');

  const varietyResult = await pool.query('SELECT crop, variety_name FROM varieties WHERE id = $1', [input.varietyId]);
  const variety = varietyResult.rows[0];
  if (!variety) throw new NotFoundError(`Variety ${input.varietyId} not found`);
  if (variety.crop !== crop) {
    throw new ValidationError(`Variety ${variety.variety_name} is registered for crop ${variety.crop}, not ${crop}`);
  }

  const [recommendations, compatibility] = await Promise.all([
    getVarietyRecommendations(input.farmerId, input.farmId, crop),
    getCropHistoryCompatibility(input.farmerId, crop),
  ]);
  const chosenRecommendation = recommendations.find((r) => r.varietyId === input.varietyId) ?? null;
  const advisory = getAgroAdvisory(crop);
  const seedQuantity = calculateSeedQuantity(crop, Number(input.targetAreaAcres));

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO crop_plans (farmer_id, farm_id, crop, variety_id, target_area_acres, calculated_seed_quantity, sowing_date, recommendation_snapshot, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::jsonb, $9)
       RETURNING id`,
      [
        input.farmerId,
        input.farmId,
        crop,
        input.varietyId,
        input.targetAreaAcres,
        seedQuantity,
        input.sowingDate ?? null,
        JSON.stringify({ chosenRecommendation, compatibility, advisory }),
        user.email,
      ],
    );
    const createdId = result.rows[0].id;

    await insertAuditLog(client, {
      entityType: 'crop_plan',
      entityId: createdId,
      action: 'CREATE_DRAFT',
      performedBy: user.email,
      metadata: { farmerId: input.farmerId, crop, varietyId: input.varietyId },
    });

    return buildCropPlanDetail(client, createdId);
  });
}

async function findCandidateSeedLot(crop: string, varietyName: string, requiredQuantity: number) {
  const result = await pool.query(
    `SELECT * FROM seed_lots
     WHERE crop = $1 AND variety = $2 AND stage = 'Certified' AND status = 'active'
       AND (quantity_total - quantity_allocated) >= $3
     ORDER BY production_date ASC
     LIMIT 1`,
    [crop, varietyName, requiredQuantity],
  );
  return result.rows[0] ?? null;
}

async function findRequestedSeedLot(seedLotId: string, crop: string, varietyName: string, requiredQuantity: number) {
  const result = await pool.query(
    `SELECT * FROM seed_lots
     WHERE id = $1 AND crop = $2 AND variety = $3 AND stage = 'Certified' AND status = 'active'
       AND (quantity_total - quantity_allocated) >= $4`,
    [seedLotId, crop, varietyName, requiredQuantity],
  );
  return result.rows[0] ?? null;
}

/**
 * The wizard's "Recommended Seed Lots" step (Farmer-Centric Features):
 * ranks every Certified, active seed lot of this exact crop/variety that
 * already has enough available quantity for the plan's calculated seed
 * requirement, by the four signals the prompt names:
 *
 *  - certified status:  has an ISSUED quality_certificates row (+40) — the
 *    same `is_certified` concept the seed lot search feature (Extend #18)
 *    uses, kept consistent rather than reintroducing a different definition
 *    of "certified" here.
 *  - germination %:      latest recorded lab_test_results.result_value for
 *    test_type='germination' on this lot (up to +30, scaled). A lot with no
 *    germination test on file scores 0 on this dimension rather than being
 *    excluded — the lab-testing workflow (Extend #15) is optional per lot,
 *    not a hard gate on plantability.
 *  - available quantity:  a hard filter (must already cover the plan's
 *    requirement — the whole point of a one-click "Reserve" from the
 *    wizard), with a small bonus (up to +10) for lots with more headroom
 *    above the requirement, so a lot that won't need topping up later is
 *    preferred over one at the exact minimum.
 *  - storage zone proximity: this schema has no farm/warehouse
 *    geocoordinates, so "proximity" is a documented best-effort heuristic —
 *    a lot currently stored at a warehouse whose organization `location`
 *    text matches the farmer's `region` scores highest (+20); a lot in any
 *    active storage at all (just not a regional match) still scores a
 *    little (+5) over one sitting unassigned; a lot with no active storage
 *    assignment scores 0 on this dimension.
 *
 * Ties break oldest-production-date-first (the same FIFO tiebreak
 * reserveSeedLot's auto-pick has always used), so the #1 recommendation is
 * exactly what auto-pick would choose absent any farmer preference.
 */
export async function getSeedLotRecommendations(cropPlanId: string): Promise<SeedLotRecommendation[]> {
  const planResult = await pool.query('SELECT * FROM crop_plans WHERE id = $1', [cropPlanId]);
  const plan = planResult.rows[0];
  if (!plan) throw new NotFoundError(`Crop plan ${cropPlanId} not found`);

  const [varietyResult, farmer] = await Promise.all([
    pool.query('SELECT variety_name FROM varieties WHERE id = $1', [plan.variety_id]),
    getFarmer(plan.farmer_id),
  ]);
  const varietyName = varietyResult.rows[0]?.variety_name;
  const requiredQuantity = Number(plan.calculated_seed_quantity);
  const region = farmer.region?.toLowerCase().trim();

  const result = await pool.query(
    `SELECT sl.id, sl.lot_code, sl.production_date, sl.unit, sl.testing_status,
            (sl.quantity_total - sl.quantity_allocated) AS quantity_available,
            COALESCE(cert.is_certified, false) AS is_certified,
            germ.germination_percent,
            COALESCE(storage.zones, ARRAY[]::text[]) AS storage_zones,
            storage.org_locations
     FROM seed_lots sl
     LEFT JOIN LATERAL (
       SELECT true AS is_certified FROM quality_certificates qc WHERE qc.seed_lot_id = sl.id AND qc.status = 'issued' LIMIT 1
     ) cert ON true
     LEFT JOIN LATERAL (
       SELECT ltr.result_value AS germination_percent
       FROM lab_test_submissions lts
       JOIN lab_test_results ltr ON ltr.submission_id = lts.id AND ltr.test_type = 'germination'
       WHERE lts.seed_lot_id = sl.id
       ORDER BY ltr.recorded_at DESC
       LIMIT 1
     ) germ ON true
     LEFT JOIN LATERAL (
       SELECT array_agg(DISTINCT sloc.warehouse_zone) AS zones,
              array_agg(DISTINCT o.location) FILTER (WHERE o.location IS NOT NULL) AS org_locations
       FROM packaging_batches pb
       JOIN storage_assignments sa ON sa.packaging_batch_id = pb.id AND sa.status = 'active'
       JOIN storage_locations sloc ON sloc.id = sa.storage_location_id
       JOIN organizations o ON o.id = sloc.organization_id
       WHERE pb.seed_lot_id = sl.id
     ) storage ON true
     WHERE sl.crop = $1 AND sl.variety = $2 AND sl.stage = 'Certified' AND sl.status = 'active'
       AND (sl.quantity_total - sl.quantity_allocated) >= $3
     ORDER BY sl.production_date ASC`,
    [plan.crop, varietyName, requiredQuantity],
  );

  return result.rows
    .map((row): SeedLotRecommendation => {
      const reasons: string[] = [];
      let score = 0;

      if (row.is_certified) {
        score += 40;
        reasons.push('Certified — has an issued quality certificate');
      }

      const germinationPercent = row.germination_percent != null ? Number(row.germination_percent) : null;
      if (germinationPercent != null) {
        score += Math.min(30, germinationPercent * 0.3);
        if (germinationPercent >= 90) reasons.push(`High germination rate (${germinationPercent}%)`);
        else if (germinationPercent < 75) reasons.push(`Caution — germination rate only ${germinationPercent}%`);
      }

      const quantityAvailable = Number(row.quantity_available);
      const surplus = quantityAvailable - requiredQuantity;
      if (requiredQuantity > 0) score += Math.max(0, Math.min(10, (surplus / requiredQuantity) * 10));
      if (surplus > 0) reasons.push(`${surplus.toFixed(0)}${row.unit} more than this plan needs`);

      const orgLocations: string[] = row.org_locations ?? [];
      const regionMatch = region && orgLocations.some((loc) => {
        const l = loc.toLowerCase();
        return l.includes(region) || region.includes(l);
      });
      if (regionMatch) {
        score += 20;
        reasons.push(`Stored near this farmer's region (${farmer.region})`);
      } else if ((row.storage_zones ?? []).length > 0) {
        score += 5;
        reasons.push('Already in active storage, ready to ship');
      }

      return {
        seedLotId: row.id,
        lotCode: row.lot_code,
        productionDate: row.production_date,
        quantityAvailable,
        unit: row.unit,
        isCertified: row.is_certified,
        testingStatus: row.testing_status,
        germinationPercent,
        storageZones: row.storage_zones ?? [],
        score: Math.round(score * 10) / 10,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime());
}

/**
 * The wizard's "reserves seed lots in real-time" step: reserves the
 * specific lot the farmer picked from the recommendations list
 * (`requestedSeedLotId`, validated as a Certified/active match with enough
 * quantity), or — for any non-wizard caller that skips straight to
 * reserving without ever fetching recommendations — falls back to the
 * original FIFO auto-pick (oldest Certified, active lot with enough
 * available quantity). Either way this calls the real
 * allocations.allocate() — an immediate, live decrement of that lot's
 * quantity_available, broadcast over the existing inventory WebSocket, not a
 * separate soft-hold mechanism.
 */
export async function reserveSeedLot(
  cropPlanId: string,
  user: AuthenticatedUser,
  requestedSeedLotId?: string,
): Promise<CropPlanWithContext> {
  const planResult = await pool.query('SELECT * FROM crop_plans WHERE id = $1', [cropPlanId]);
  const plan = planResult.rows[0];
  if (!plan) throw new NotFoundError(`Crop plan ${cropPlanId} not found`);
  if (plan.status !== 'draft') {
    throw new ConflictError(`Crop plan is ${plan.status} — only a draft plan can be reserved`);
  }

  const varietyResult = await pool.query('SELECT variety_name FROM varieties WHERE id = $1', [plan.variety_id]);
  const varietyName = varietyResult.rows[0]?.variety_name;

  const candidateLot = requestedSeedLotId
    ? await findRequestedSeedLot(requestedSeedLotId, plan.crop, varietyName, Number(plan.calculated_seed_quantity))
    : await findCandidateSeedLot(plan.crop, varietyName, Number(plan.calculated_seed_quantity));
  if (!candidateLot) {
    throw new ConflictError(
      requestedSeedLotId
        ? `Seed lot ${requestedSeedLotId} is not a Certified, active ${plan.crop} — ${varietyName} lot with enough available quantity for this plan`
        : `No Certified, active seed lot of ${plan.crop} — ${varietyName} currently has ${plan.calculated_seed_quantity}${plan.seed_unit} available`,
    );
  }

  const farmer = await getFarmer(plan.farmer_id);
  const { allocation } = await allocate(
    candidateLot.id,
    {
      quantity: Number(plan.calculated_seed_quantity),
      allocatedTo: `Farmer: ${farmer.name}`,
      cropPlanId: plan.id,
      notes: 'Crop planning wizard reservation',
    },
    user,
  );

  return withTransaction(async (client) => {
    await client.query(
      `UPDATE crop_plans SET status = 'reserved', seed_lot_id = $1, allocation_id = $2, updated_at = now() WHERE id = $3`,
      [candidateLot.id, allocation.id, cropPlanId],
    );

    await insertAuditLog(client, {
      entityType: 'crop_plan',
      entityId: cropPlanId,
      action: 'RESERVE_SEED_LOT',
      performedBy: user.email,
      metadata: { seedLotId: candidateLot.id, lotCode: candidateLot.lot_code, allocationId: allocation.id },
    });

    return buildCropPlanDetail(client, cropPlanId);
  });
}

export async function confirmCropPlan(cropPlanId: string, user: AuthenticatedUser): Promise<CropPlanWithContext> {
  return withTransaction(async (client) => {
    const planResult = await client.query('SELECT * FROM crop_plans WHERE id = $1 FOR UPDATE', [cropPlanId]);
    const plan = planResult.rows[0];
    if (!plan) throw new NotFoundError(`Crop plan ${cropPlanId} not found`);
    if (plan.status !== 'reserved') {
      throw new ConflictError(`Crop plan is ${plan.status} — a seed lot must be reserved before the booking can be confirmed`);
    }

    await client.query(`UPDATE crop_plans SET status = 'confirmed', updated_at = now() WHERE id = $1`, [cropPlanId]);

    await insertAuditLog(client, {
      entityType: 'crop_plan',
      entityId: cropPlanId,
      action: 'CONFIRM_BOOKING',
      performedBy: user.email,
      beforeState: { status: plan.status },
      afterState: { status: 'confirmed' },
    });

    return buildCropPlanDetail(client, cropPlanId);
  });
}

export async function cancelCropPlan(
  cropPlanId: string,
  reason: string | undefined,
  user: AuthenticatedUser,
): Promise<CropPlanWithContext> {
  const planResult = await pool.query('SELECT * FROM crop_plans WHERE id = $1', [cropPlanId]);
  const plan = planResult.rows[0];
  if (!plan) throw new NotFoundError(`Crop plan ${cropPlanId} not found`);
  if (plan.status === 'cancelled') throw new ConflictError('Crop plan is already cancelled');

  if (plan.allocation_id) {
    await release(plan.allocation_id, { notes: reason?.trim() || 'Crop plan cancelled' }, user);
  }

  return withTransaction(async (client) => {
    await client.query(`UPDATE crop_plans SET status = 'cancelled', updated_at = now() WHERE id = $1`, [cropPlanId]);

    await insertAuditLog(client, {
      entityType: 'crop_plan',
      entityId: cropPlanId,
      action: 'CANCEL',
      performedBy: user.email,
      metadata: { reason: reason?.trim() },
    });

    return buildCropPlanDetail(client, cropPlanId);
  });
}

export async function listCropPlans(filters: { farmerId?: string; status?: string }): Promise<CropPlanWithContext[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.farmerId) {
    values.push(filters.farmerId);
    conditions.push(`cp.farmer_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`cp.status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(`SELECT cp.id FROM crop_plans cp ${whereClause} ORDER BY cp.created_at DESC`, values);
  return Promise.all(result.rows.map((row) => buildCropPlanDetail(pool, row.id)));
}

export async function getCropPlanById(id: string): Promise<CropPlanWithContext> {
  return buildCropPlanDetail(pool, id);
}
