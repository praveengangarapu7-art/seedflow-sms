import { pool } from '../../db/pool';
import { NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { getVarietyEffectiveness } from '../performanceRatings/performanceRatings.service';
import { computeDemandScore, computeSuggestedPrice, type WeatherOutlook } from './demandScoring';
import type {
  BreedingPriorityRecommendation,
  CropInsuranceRecordRow,
  MarketPriceObservationRow,
  MinistryDemandForecastRow,
  RecordCropInsuranceInput,
  RecordMarketPriceInput,
  RecordMinistryForecastInput,
  RecordWeatherOutlookInput,
  VarietyDemandForecastRow,
  WeatherOutlookRow,
} from './marketIntelligence.types';

// Recording an external market signal (there being no live feed, staff
// enters what an external bulletin/authority reported) and generating a
// forecast from it are gated the same way varieties.ts gates committee
// activity — Admin/Breeder, the app's existing "market/breeding judgment"
// authority — rather than inventing a new role.
export const MARKET_DATA_ROLES = ['Admin', 'Breeder'];

// --- Recording external observations ------------------------------------

export async function recordMarketPrice(input: RecordMarketPriceInput, user: AuthenticatedUser): Promise<MarketPriceObservationRow> {
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!Number.isFinite(Number(input.pricePerUnit)) || Number(input.pricePerUnit) <= 0) {
    throw new ValidationError('pricePerUnit must be a positive number');
  }
  if (!input.observedDate) throw new ValidationError('observedDate is required');
  if (!input.source?.trim()) throw new ValidationError('source is required');

  const result = await pool.query<MarketPriceObservationRow>(
    `INSERT INTO market_price_observations (crop, variety, region, price_per_unit, unit, observed_date, source, recorded_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'kg'), $6, $7, $8) RETURNING *`,
    [
      input.crop.trim(),
      input.variety?.trim() || null,
      input.region?.trim() || null,
      input.pricePerUnit,
      input.unit ?? null,
      input.observedDate,
      input.source.trim(),
      user.email,
    ],
  );
  return result.rows[0];
}

export async function listMarketPrices(filters: { crop?: string; variety?: string } = {}): Promise<MarketPriceObservationRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`variety = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<MarketPriceObservationRow>(
    `SELECT * FROM market_price_observations ${whereClause} ORDER BY observed_date DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

export async function recordMinistryForecast(input: RecordMinistryForecastInput, user: AuthenticatedUser): Promise<MinistryDemandForecastRow> {
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.season?.trim()) throw new ValidationError('season is required');
  if (!Number.isFinite(Number(input.forecastedDemandQuantity)) || Number(input.forecastedDemandQuantity) < 0) {
    throw new ValidationError('forecastedDemandQuantity must be a non-negative number');
  }
  if (!input.issuingAuthority?.trim()) throw new ValidationError('issuingAuthority is required');
  if (!input.publishedDate) throw new ValidationError('publishedDate is required');

  const result = await pool.query<MinistryDemandForecastRow>(
    `INSERT INTO ministry_demand_forecasts (crop, variety, region, season, forecasted_demand_quantity, unit, issuing_authority, published_date, recorded_by)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'kg'), $7, $8, $9) RETURNING *`,
    [
      input.crop.trim(),
      input.variety?.trim() || null,
      input.region?.trim() || null,
      input.season.trim(),
      input.forecastedDemandQuantity,
      input.unit ?? null,
      input.issuingAuthority.trim(),
      input.publishedDate,
      user.email,
    ],
  );
  return result.rows[0];
}

export async function listMinistryForecasts(filters: { crop?: string; variety?: string } = {}): Promise<MinistryDemandForecastRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`variety = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<MinistryDemandForecastRow>(
    `SELECT * FROM ministry_demand_forecasts ${whereClause} ORDER BY published_date DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

const WEATHER_OUTLOOKS: WeatherOutlook[] = ['favorable', 'normal', 'adverse', 'severe'];

export async function recordWeatherOutlook(input: RecordWeatherOutlookInput, user: AuthenticatedUser): Promise<WeatherOutlookRow> {
  if (!input.region?.trim()) throw new ValidationError('region is required');
  if (!input.season?.trim()) throw new ValidationError('season is required');
  if (!WEATHER_OUTLOOKS.includes(input.outlook)) {
    throw new ValidationError(`outlook must be one of: ${WEATHER_OUTLOOKS.join(', ')}`);
  }
  if (!input.issuingAuthority?.trim()) throw new ValidationError('issuingAuthority is required');

  const result = await pool.query<WeatherOutlookRow>(
    `INSERT INTO weather_outlooks (region, crop, season, outlook, rainfall_deviation_percent, issuing_authority, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      input.region.trim(),
      input.crop?.trim() || null,
      input.season.trim(),
      input.outlook,
      input.rainfallDeviationPercent ?? null,
      input.issuingAuthority.trim(),
      user.email,
    ],
  );
  return result.rows[0];
}

export async function listWeatherOutlooks(filters: { crop?: string; region?: string } = {}): Promise<WeatherOutlookRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.region) {
    values.push(filters.region);
    conditions.push(`region = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<WeatherOutlookRow>(
    `SELECT * FROM weather_outlooks ${whereClause} ORDER BY created_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

export async function recordCropInsurance(input: RecordCropInsuranceInput, user: AuthenticatedUser): Promise<CropInsuranceRecordRow> {
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.season?.trim()) throw new ValidationError('season is required');
  if (!Number.isInteger(input.claimsCount) || input.claimsCount < 0) {
    throw new ValidationError('claimsCount must be a non-negative integer');
  }
  if (!Number.isFinite(Number(input.totalClaimAmount)) || Number(input.totalClaimAmount) < 0) {
    throw new ValidationError('totalClaimAmount must be a non-negative number');
  }

  const result = await pool.query<CropInsuranceRecordRow>(
    `INSERT INTO crop_insurance_records (crop, variety, region, season, claims_count, total_claim_amount, total_insured_quantity, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      input.crop.trim(),
      input.variety?.trim() || null,
      input.region?.trim() || null,
      input.season.trim(),
      input.claimsCount,
      input.totalClaimAmount,
      input.totalInsuredQuantity ?? null,
      user.email,
    ],
  );
  return result.rows[0];
}

export async function listCropInsuranceRecords(filters: { crop?: string; variety?: string } = {}): Promise<CropInsuranceRecordRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`variety = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<CropInsuranceRecordRow>(
    `SELECT * FROM crop_insurance_records ${whereClause} ORDER BY created_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

// --- Forecast generation --------------------------------------------------

/**
 * Variety-specific observations and crop-wide ones are two different price
 * series — blending them into one ORDER BY would let a handful of
 * crop-wide rows silently distort a variety's own trend. Prefer a
 * variety-specific series if one exists at all; only fall back to the
 * crop-wide series (never mix the two) when it doesn't.
 */
async function priceTrendPercent(crop: string, variety: string): Promise<{ trend: number | null; basePrice: number | null }> {
  const varietyResult = await pool.query<{ price_per_unit: number }>(
    `SELECT price_per_unit FROM market_price_observations WHERE crop = $1 AND variety = $2 ORDER BY observed_date DESC LIMIT 10`,
    [crop, variety],
  );
  const rows = varietyResult.rows.length > 0
    ? varietyResult.rows
    : (
        await pool.query<{ price_per_unit: number }>(
          `SELECT price_per_unit FROM market_price_observations WHERE crop = $1 AND variety IS NULL ORDER BY observed_date DESC LIMIT 10`,
          [crop],
        )
      ).rows;
  if (rows.length === 0) return { trend: null, basePrice: null };

  const basePrice = Number(rows[0].price_per_unit);
  if (rows.length < 2) return { trend: null, basePrice };

  const oldest = Number(rows[rows.length - 1].price_per_unit);
  const newest = Number(rows[0].price_per_unit);
  const trend = oldest > 0 ? Math.round(((newest - oldest) / oldest) * 1000) / 10 : null;
  return { trend, basePrice };
}

async function ministryGrowthPercent(crop: string, variety: string): Promise<number | null> {
  const varietyResult = await pool.query<{ forecasted_demand_quantity: number }>(
    `SELECT forecasted_demand_quantity FROM ministry_demand_forecasts WHERE crop = $1 AND variety = $2 ORDER BY published_date DESC LIMIT 2`,
    [crop, variety],
  );
  const rows = varietyResult.rows.length >= 2
    ? varietyResult.rows
    : (
        await pool.query<{ forecasted_demand_quantity: number }>(
          `SELECT forecasted_demand_quantity FROM ministry_demand_forecasts WHERE crop = $1 AND variety IS NULL ORDER BY published_date DESC LIMIT 2`,
          [crop],
        )
      ).rows;
  if (rows.length < 2) return null;
  const [newest, older] = rows;
  const oldValue = Number(older.forecasted_demand_quantity);
  if (oldValue <= 0) return null;
  return Math.round(((Number(newest.forecasted_demand_quantity) - oldValue) / oldValue) * 1000) / 10;
}

async function latestWeatherOutlook(crop: string, season: string): Promise<WeatherOutlook | null> {
  const result = await pool.query<{ outlook: WeatherOutlook }>(
    `SELECT outlook FROM weather_outlooks WHERE crop = $1 AND season = $2 ORDER BY created_at DESC LIMIT 1`,
    [crop, season],
  );
  return result.rows[0]?.outlook ?? null;
}

async function totalInsuranceClaims(crop: string, variety: string, season: string): Promise<number | null> {
  const varietyResult = await pool.query<{ total: string | null; count: string }>(
    `SELECT SUM(claims_count) AS total, COUNT(*) AS count FROM crop_insurance_records WHERE crop = $1 AND season = $2 AND variety = $3`,
    [crop, season, variety],
  );
  if (Number(varietyResult.rows[0].count) > 0) return Number(varietyResult.rows[0].total ?? 0);

  const cropWideResult = await pool.query<{ total: string | null; count: string }>(
    `SELECT SUM(claims_count) AS total, COUNT(*) AS count FROM crop_insurance_records WHERE crop = $1 AND season = $2 AND variety IS NULL`,
    [crop, season],
  );
  if (Number(cropWideResult.rows[0].count) > 0) return Number(cropWideResult.rows[0].total ?? 0);
  return null;
}

/**
 * Gathers every available signal for one crop+variety+season, hands them to
 * the pure demandScoring engine, and stores the result (score, action,
 * suggested price, AND the full signal breakdown) as a versioned snapshot —
 * so a later change to the underlying market data never silently rewrites
 * what an earlier forecast said or why.
 */
export async function generateDemandForecast(crop: string, variety: string, season: string, user: AuthenticatedUser): Promise<VarietyDemandForecastRow> {
  if (!crop?.trim()) throw new ValidationError('crop is required');
  if (!variety?.trim()) throw new ValidationError('variety is required');
  if (!season?.trim()) throw new ValidationError('season is required');

  const [effectiveness, priceInfo, ministryGrowth, weatherOutlook, insuranceClaims] = await Promise.all([
    getVarietyEffectiveness(),
    priceTrendPercent(crop, variety),
    ministryGrowthPercent(crop, variety),
    latestWeatherOutlook(crop, season),
    totalInsuranceClaims(crop, variety, season),
  ]);

  const varietyEntry = effectiveness.find((e) => e.crop === crop && e.variety === variety);

  const { score, recommendedAction, breakdown } = computeDemandScore({
    adoptionRatePercent: varietyEntry?.adoptionRate ?? null,
    repeatRequestRatePercent: varietyEntry?.repeatRequestRate ?? null,
    priceTrendPercent: priceInfo.trend,
    ministryGrowthPercent: ministryGrowth,
    weatherOutlook,
    insuranceClaimsCount: insuranceClaims,
  });
  const suggestedPrice = computeSuggestedPrice(priceInfo.basePrice, score);

  const result = await pool.query<VarietyDemandForecastRow>(
    `INSERT INTO variety_demand_forecasts (crop, variety, season, demand_score, recommended_action, suggested_price_per_unit, signals_breakdown, generated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) RETURNING *`,
    [crop.trim(), variety.trim(), season.trim(), score, recommendedAction, suggestedPrice, JSON.stringify(breakdown), user.email],
  );
  return result.rows[0];
}

export async function listDemandForecasts(filters: { crop?: string; variety?: string; season?: string } = {}): Promise<VarietyDemandForecastRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`variety = $${values.length}`);
  }
  if (filters.season) {
    values.push(filters.season);
    conditions.push(`season = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<VarietyDemandForecastRow>(
    `SELECT * FROM variety_demand_forecasts ${whereClause} ORDER BY generated_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

/** Only the single most recent forecast per crop+variety for a season — the "current outlook" ranking a dashboard shows, not every historical regeneration. */
export async function getLatestDemandForecasts(season: string): Promise<VarietyDemandForecastRow[]> {
  if (!season?.trim()) throw new ValidationError('season is required');
  const result = await pool.query<VarietyDemandForecastRow>(
    `SELECT DISTINCT ON (crop, variety) * FROM variety_demand_forecasts
     WHERE season = $1
     ORDER BY crop, variety, generated_at DESC`,
    [season.trim()],
  );
  return result.rows.sort((a, b) => Number(b.demand_score) - Number(a.demand_score));
}

export async function getDemandForecast(id: string): Promise<VarietyDemandForecastRow> {
  const result = await pool.query<VarietyDemandForecastRow>('SELECT * FROM variety_demand_forecasts WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Demand forecast ${id} not found`);
  return row;
}

// --- Breeding priority recommendations (live, not stored) ----------------

/**
 * Compares each variety's latest demand forecast against what's actually
 * being planned/produced RIGHT NOW (live crop_plans + Certified seed_lots)
 * — deliberately NOT stored, since a stored snapshot would go stale the
 * moment a new crop plan is booked, the same reasoning compliance's
 * getQualityMetrics stays a live query while its signed certificates don't.
 */
export async function getBreedingPriorityRecommendations(season: string): Promise<BreedingPriorityRecommendation[]> {
  const forecasts = await getLatestDemandForecasts(season);
  if (forecasts.length === 0) return [];

  return Promise.all(
    forecasts.map(async (forecast) => {
      const [planCountResult, supplyResult] = await Promise.all([
        pool.query<{ count: string }>(
          `SELECT COUNT(*)::int AS count FROM crop_plans cp
           JOIN varieties v ON v.id = cp.variety_id
           WHERE v.crop = $1 AND v.variety_name = $2 AND cp.status IN ('draft', 'reserved', 'confirmed')`,
          [forecast.crop, forecast.variety],
        ),
        pool.query<{ total: string | null }>(
          `SELECT SUM(quantity_total) AS total FROM seed_lots WHERE crop = $1 AND variety = $2 AND stage = 'Certified' AND status = 'active'`,
          [forecast.crop, forecast.variety],
        ),
      ]);

      const activeCropPlanCount = Number(planCountResult.rows[0].count);
      const currentCertifiedSupply = Number(supplyResult.rows[0].total ?? 0);

      let priorityNote: string;
      if (forecast.recommended_action === 'increase_production' && activeCropPlanCount === 0) {
        priorityNote = 'High demand forecast with no active crop plans — a priority gap for the next breeding cycle.';
      } else if (forecast.recommended_action === 'increase_production') {
        priorityNote = `High demand forecast, ${activeCropPlanCount} active crop plan(s) already underway.`;
      } else if (forecast.recommended_action === 'decrease_production' && currentCertifiedSupply > 0) {
        priorityNote = `Low demand forecast with ${currentCertifiedSupply.toLocaleString()} units of Certified stock already on hand — consider redirecting breeding capacity.`;
      } else {
        priorityNote = 'Demand forecast is steady — no reallocation indicated.';
      }

      return {
        crop: forecast.crop,
        variety: forecast.variety,
        season: forecast.season,
        demandScore: Number(forecast.demand_score),
        recommendedAction: forecast.recommended_action,
        activeCropPlanCount,
        currentCertifiedSupply,
        priorityNote,
      };
    }),
  );
}
