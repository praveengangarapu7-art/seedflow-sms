import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { getVarietyRecommendations } from '../cropPlanning/cropPlanning.service';
import { getFarmer } from '../farmers/farmers.service';
import { broadcast } from '../../ws/server';
import { computeClimateResilienceScore } from './climateResilienceScoring';
import { suggestCropRotation, type CropRotationSuggestion } from './cropRotation';
import {
  RISK_LEVELS,
  PRIMARY_RISK_FACTORS,
  OUTCOME_RATINGS,
  type AdaptationOutcomeRow,
  type ClimatePredictionRow,
  type ClimateRiskAlertRow,
  type ClimateSmartRecommendation,
  type PrimaryRiskFactor,
  type RecordAdaptationOutcomeInput,
  type RecordClimatePredictionInput,
} from './climateSmartSelection.types';

// Recording climate predictions and adaptation outcomes is gated the same
// way every other "external observation" module this session is —
// Admin/Breeder, this app's existing breeding/market-judgment authority.
export const CLIMATE_DATA_ROLES = ['Admin', 'Breeder'];

const RISK_TOLERANCE_TRAIT: Partial<Record<PrimaryRiskFactor, string>> = {
  drought: 'drought_tolerance',
  excess_rainfall: 'flood_tolerance',
  heat: 'heat_tolerance',
};

const TOLERANCE_CATEGORY_SCORE: Record<string, number> = {
  high: 100,
  moderate: 60,
  low: 30,
  susceptible: 0,
};

const OUTCOME_RATING_SCORE: Record<string, number> = {
  excellent: 100,
  good: 75,
  fair: 50,
  poor: 20,
};

// --- Climate predictions --------------------------------------------------

export async function recordClimatePrediction(input: RecordClimatePredictionInput, user: AuthenticatedUser): Promise<ClimatePredictionRow> {
  if (!input.region?.trim()) throw new ValidationError('region is required');
  if (!input.season?.trim()) throw new ValidationError('season is required');
  if (!input.source?.trim()) throw new ValidationError('source is required');
  if (input.riskLevel && !(RISK_LEVELS as readonly string[]).includes(input.riskLevel)) {
    throw new ValidationError(`riskLevel must be one of: ${RISK_LEVELS.join(', ')}`);
  }
  if (input.primaryRiskFactor && !(PRIMARY_RISK_FACTORS as readonly string[]).includes(input.primaryRiskFactor)) {
    throw new ValidationError(`primaryRiskFactor must be one of: ${PRIMARY_RISK_FACTORS.join(', ')}`);
  }

  const prediction = await withTransaction(async (client) => {
    const result = await client.query<ClimatePredictionRow>(
      `INSERT INTO climate_predictions
         (region, season, predicted_rainfall_mm, predicted_avg_temp_celsius, predicted_min_temp_celsius, predicted_max_temp_celsius, risk_level, primary_risk_factor, source, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'low'), $8, $9, $10)
       RETURNING *`,
      [
        input.region.trim(),
        input.season.trim(),
        input.predictedRainfallMm ?? null,
        input.predictedAvgTempCelsius ?? null,
        input.predictedMinTempCelsius ?? null,
        input.predictedMaxTempCelsius ?? null,
        input.riskLevel ?? null,
        input.primaryRiskFactor ?? null,
        input.source.trim(),
        user.email,
      ],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'climate_prediction',
      entityId: row.id,
      action: 'RECORD',
      performedBy: user.email,
      afterState: row,
    });
    return row;
  });

  // Alert fan-out is deliberately OUTSIDE the transaction that just
  // committed — it reads farms/crop_plans state and inserts separate alert
  // rows, the same fire-and-forget-after-commit shape genealogy refresh and
  // low-stock broadcasts already use elsewhere in this app.
  if (prediction.risk_level === 'high' || prediction.risk_level === 'severe') {
    await triggerClimateRiskAlerts(prediction, user);
  }

  return prediction;
}

export async function listClimatePredictions(filters: { region?: string; season?: string } = {}): Promise<ClimatePredictionRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.region) {
    values.push(filters.region);
    conditions.push(`region = $${values.length}`);
  }
  if (filters.season) {
    values.push(filters.season);
    conditions.push(`season = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<ClimatePredictionRow>(
    `SELECT * FROM climate_predictions ${whereClause} ORDER BY created_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

async function getLatestClimatePrediction(region: string, season?: string): Promise<ClimatePredictionRow | null> {
  const conditions = ['region = $1'];
  const values: unknown[] = [region];
  if (season) {
    values.push(season);
    conditions.push(`season = $${values.length}`);
  }
  const result = await pool.query<ClimatePredictionRow>(
    `SELECT * FROM climate_predictions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 1`,
    values,
  );
  return result.rows[0] ?? null;
}

// --- Climate risk alerts ---------------------------------------------------

/**
 * One alert per (farm, actively-planned crop) in the affected region — a
 * farm with no active crop plan has nothing concrete to warn about yet, so
 * it's skipped rather than sent a generic alert. Delivered in real time via
 * the existing WebSocket broadcast() (the same mechanism LOW_STOCK_ALERT
 * already uses), since no farmer-linked device/SMS channel exists anywhere
 * in this app; the inserted rows are the durable, queryable alert record.
 */
async function triggerClimateRiskAlerts(prediction: ClimatePredictionRow, user: AuthenticatedUser): Promise<ClimateRiskAlertRow[]> {
  const affectedResult = await pool.query<{ farm_id: string; farmer_id: string; crop: string }>(
    `SELECT DISTINCT f.id AS farm_id, f.farmer_id, cp.crop
     FROM farms f
     JOIN farmers fm ON fm.id = f.farmer_id
     JOIN crop_plans cp ON cp.farm_id = f.id AND cp.status IN ('draft', 'reserved', 'confirmed')
     WHERE fm.region = $1`,
    [prediction.region],
  );

  const alerts: ClimateRiskAlertRow[] = [];
  for (const row of affectedResult.rows) {
    const message = `${prediction.risk_level === 'severe' ? 'Severe' : 'High'} ${prediction.primary_risk_factor ?? 'climate'} risk predicted for ${prediction.region} this ${prediction.season} — your ${row.crop} planting may be affected.`;
    const result = await pool.query<ClimateRiskAlertRow>(
      `INSERT INTO climate_risk_alerts (climate_prediction_id, farm_id, farmer_id, crop, risk_level, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [prediction.id, row.farm_id, row.farmer_id, row.crop, prediction.risk_level, message],
    );
    alerts.push(result.rows[0]);
  }

  if (alerts.length > 0) {
    broadcast('CLIMATE_RISK_ALERT', {
      region: prediction.region,
      season: prediction.season,
      riskLevel: prediction.risk_level,
      primaryRiskFactor: prediction.primary_risk_factor,
      affectedFarmCount: alerts.length,
      recordedBy: user.email,
    });
  }

  return alerts;
}

export async function listClimateRiskAlerts(filters: { farmId?: string; farmerId?: string; acknowledged?: boolean } = {}): Promise<ClimateRiskAlertRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.farmId) {
    values.push(filters.farmId);
    conditions.push(`farm_id = $${values.length}`);
  }
  if (filters.farmerId) {
    values.push(filters.farmerId);
    conditions.push(`farmer_id = $${values.length}`);
  }
  if (filters.acknowledged !== undefined) {
    values.push(filters.acknowledged);
    conditions.push(`acknowledged = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<ClimateRiskAlertRow>(
    `SELECT * FROM climate_risk_alerts ${whereClause} ORDER BY created_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

export async function acknowledgeClimateRiskAlert(id: string, user: AuthenticatedUser): Promise<ClimateRiskAlertRow> {
  const result = await pool.query<ClimateRiskAlertRow>(
    `UPDATE climate_risk_alerts SET acknowledged = true, acknowledged_by = $1, acknowledged_at = now() WHERE id = $2 RETURNING *`,
    [user.email, id],
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Climate risk alert ${id} not found`);
  return row;
}

// --- Climate-smart variety recommendations ---------------------------------

async function getToleranceScore(varietyName: string, riskFactor: PrimaryRiskFactor | null): Promise<number | null> {
  const traitType = riskFactor ? RISK_TOLERANCE_TRAIT[riskFactor] : undefined;
  if (!traitType) return null;

  const result = await pool.query<{ category_value: string }>(
    `SELECT ltm.category_value
     FROM lot_trait_measurements ltm
     JOIN seed_lots sl ON sl.id = ltm.seed_lot_id
     WHERE sl.variety = $1 AND ltm.trait_type = $2 AND ltm.category_value IS NOT NULL
     ORDER BY ltm.measured_date DESC`,
    [varietyName, traitType],
  );
  if (result.rows.length === 0) return null;

  const scores = result.rows.map((r) => TOLERANCE_CATEGORY_SCORE[r.category_value]).filter((s) => s !== undefined);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10;
}

async function getAdaptationTrackRecordScore(varietyId: string, riskLevel: string): Promise<number | null> {
  const result = await pool.query<{ outcome_rating: string }>(
    `SELECT ao.outcome_rating
     FROM adaptation_outcomes ao
     JOIN climate_predictions cp ON cp.id = ao.climate_prediction_id
     WHERE ao.variety_id = $1 AND cp.risk_level = $2`,
    [varietyId, riskLevel],
  );
  if (result.rows.length === 0) return null;
  const scores = result.rows.map((r) => OUTCOME_RATING_SCORE[r.outcome_rating]).filter((s) => s !== undefined);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10;
}

/**
 * Wraps the existing crop-planning wizard's farm/soil/history-aware
 * recommendation engine (cropPlanning.service.ts's getVarietyRecommendations)
 * rather than reimplementing it, and layers a climate-resilience score on
 * top from real recorded signals — see climateResilienceScoring.ts. The
 * original score and reasons are preserved unchanged; climate influence is
 * additive and clearly separated in the response, not silently blended in.
 */
export async function getClimateSmartRecommendations(farmerId: string, farmId: string, crop: string): Promise<ClimateSmartRecommendation[]> {
  const [baseRecommendations, farmer] = await Promise.all([getVarietyRecommendations(farmerId, farmId, crop), getFarmer(farmerId)]);
  const latestClimate = await getLatestClimatePrediction(farmer.region);

  const enriched = await Promise.all(
    baseRecommendations.map(async (rec) => {
      const [toleranceScore, adaptationTrackRecordScore] = await Promise.all([
        latestClimate ? getToleranceScore(rec.varietyName, latestClimate.primary_risk_factor) : Promise.resolve(null),
        latestClimate ? getAdaptationTrackRecordScore(rec.varietyId, latestClimate.risk_level) : Promise.resolve(null),
      ]);
      const { score: climateResilienceScore, breakdown: climateBreakdown } = computeClimateResilienceScore({
        toleranceScore,
        adaptationTrackRecordScore,
      });

      // Climate is a meaningful but non-dominant adjustment on top of the
      // existing farm/soil/history score — at most another ~30 points on
      // the same roughly-0-100 scale, never overriding it outright.
      const combinedScore = Math.round((rec.score + (climateResilienceScore ?? 0) * 0.3) * 10) / 10;

      return {
        varietyId: rec.varietyId,
        varietyName: rec.varietyName,
        botanicalName: rec.botanicalName,
        yieldBenchmarkPerAcre: rec.yieldBenchmarkPerAcre,
        yieldUnit: rec.yieldUnit,
        marketDemandTrend: rec.marketDemandTrend,
        baseScore: rec.score,
        baseReasons: rec.reasons,
        climateResilienceScore,
        climateBreakdown,
        combinedScore,
      };
    }),
  );

  return enriched.sort((a, b) => b.combinedScore - a.combinedScore);
}

// --- Crop rotation suggestions ----------------------------------------------

export async function suggestCropRotationForFarm(farmId: string): Promise<CropRotationSuggestion[]> {
  const result = await pool.query<{ crop: string }>(
    `SELECT crop FROM crop_plans WHERE farm_id = $1 AND status <> 'cancelled' ORDER BY created_at DESC LIMIT 1`,
    [farmId],
  );
  const lastCrop = result.rows[0]?.crop ?? null;
  return suggestCropRotation(lastCrop);
}

// --- Adaptation outcomes -----------------------------------------------------

export async function recordAdaptationOutcome(input: RecordAdaptationOutcomeInput, user: AuthenticatedUser): Promise<AdaptationOutcomeRow> {
  if (!input.farmId) throw new ValidationError('farmId is required');
  if (!input.varietyId) throw new ValidationError('varietyId is required');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.season?.trim()) throw new ValidationError('season is required');
  if (!(OUTCOME_RATINGS as readonly string[]).includes(input.outcomeRating)) {
    throw new ValidationError(`outcomeRating must be one of: ${OUTCOME_RATINGS.join(', ')}`);
  }

  const result = await pool.query<AdaptationOutcomeRow>(
    `INSERT INTO adaptation_outcomes (farm_id, variety_id, climate_prediction_id, crop, season, actual_yield_per_acre, outcome_rating, notes, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      input.farmId,
      input.varietyId,
      input.climatePredictionId ?? null,
      input.crop.trim(),
      input.season.trim(),
      input.actualYieldPerAcre ?? null,
      input.outcomeRating,
      input.notes ?? null,
      user.email,
    ],
  );
  return result.rows[0];
}

export async function listAdaptationOutcomes(filters: { farmId?: string; varietyId?: string } = {}): Promise<AdaptationOutcomeRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.farmId) {
    values.push(filters.farmId);
    conditions.push(`farm_id = $${values.length}`);
  }
  if (filters.varietyId) {
    values.push(filters.varietyId);
    conditions.push(`variety_id = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<AdaptationOutcomeRow>(
    `SELECT * FROM adaptation_outcomes ${whereClause} ORDER BY recorded_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}
