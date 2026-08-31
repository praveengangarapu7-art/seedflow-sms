import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { getFarmer } from '../farmers/farmers.service';
import type { PerformanceRatingRow, SubmitRatingInput, VarietyEffectivenessEntry } from './performanceRatings.types';

function assertRating(field: string, value: unknown): void {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw new ValidationError(`${field} must be an integer between 1 and 5`);
  }
}

export async function submitRating(input: SubmitRatingInput, user: AuthenticatedUser): Promise<PerformanceRatingRow> {
  if (!input.farmerId) throw new ValidationError('farmerId is required');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.variety?.trim()) throw new ValidationError('variety is required');
  assertRating('germinationRating', input.germinationRating);
  assertRating('yieldRating', input.yieldRating);
  assertRating('overallRating', input.overallRating);

  await getFarmer(input.farmerId);

  return withTransaction(async (client) => {
    const result = await client.query<PerformanceRatingRow>(
      `INSERT INTO performance_ratings
         (farmer_id, seed_request_id, crop, variety, germination_rating, yield_rating, overall_rating, harvested_quantity, feedback_text, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.farmerId,
        input.seedRequestId ?? null,
        input.crop.trim(),
        input.variety.trim(),
        input.germinationRating,
        input.yieldRating,
        input.overallRating,
        input.harvestedQuantity ?? null,
        input.feedbackText ?? null,
        user.email,
      ],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'performance_rating',
      entityId: row.id,
      action: 'SUBMIT_RATING',
      performedBy: user.email,
      afterState: row,
      metadata: { farmerId: input.farmerId },
    });

    return row;
  });
}

export async function listRatings(filters: { farmerId?: string; crop?: string; variety?: string }): Promise<PerformanceRatingRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.farmerId) {
    values.push(filters.farmerId);
    conditions.push(`farmer_id = $${values.length}`);
  }
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`variety = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<PerformanceRatingRow>(
    `SELECT * FROM performance_ratings ${whereClause} ORDER BY created_at DESC`,
    values,
  );
  return result.rows;
}

/**
 * Every number here comes from real relational data — no survey scaffolding
 * invented. "Adoption" = distinct farmers who actually received (delivered)
 * a variety, out of every farmer in the system; "reporting rate" = how many
 * of those served farmers bothered to give feedback; "repeat request rate"
 * = a satisfaction proxy independent of the 1-5 scores themselves.
 */
export async function getVarietyEffectiveness(): Promise<VarietyEffectivenessEntry[]> {
  const totalFarmersResult = await pool.query<{ count: string }>('SELECT COUNT(*)::int AS count FROM farmers');
  const totalFarmers = Number(totalFarmersResult.rows[0].count);

  const deliveredResult = await pool.query<{ crop: string; variety: string; farmer_id: string; delivery_count: string }>(
    "SELECT crop, variety, farmer_id, COUNT(*)::int AS delivery_count FROM seed_requests WHERE status = 'delivered' GROUP BY crop, variety, farmer_id",
  );

  const ratingsResult = await pool.query<{
    crop: string;
    variety: string;
    farmer_count: string;
    rating_count: string;
    avg_germination: string;
    avg_yield: string;
    avg_overall: string;
  }>(
    `SELECT crop, variety,
            COUNT(DISTINCT farmer_id)::int AS farmer_count,
            COUNT(*)::int AS rating_count,
            AVG(germination_rating) AS avg_germination,
            AVG(yield_rating) AS avg_yield,
            AVG(overall_rating) AS avg_overall
     FROM performance_ratings
     GROUP BY crop, variety`,
  );

  const byKey = new Map<string, { crop: string; variety: string; servedFarmerIds: Set<string>; repeatFarmerCount: number }>();
  for (const row of deliveredResult.rows) {
    const key = `${row.crop}::${row.variety}`;
    const entry = byKey.get(key) ?? { crop: row.crop, variety: row.variety, servedFarmerIds: new Set<string>(), repeatFarmerCount: 0 };
    entry.servedFarmerIds.add(row.farmer_id);
    if (Number(row.delivery_count) > 1) entry.repeatFarmerCount += 1;
    byKey.set(key, entry);
  }

  const ratingsByKey = new Map(ratingsResult.rows.map((row) => [`${row.crop}::${row.variety}`, row]));
  for (const row of ratingsResult.rows) {
    const key = `${row.crop}::${row.variety}`;
    if (!byKey.has(key)) {
      byKey.set(key, { crop: row.crop, variety: row.variety, servedFarmerIds: new Set<string>(), repeatFarmerCount: 0 });
    }
  }

  const entries: VarietyEffectivenessEntry[] = [];
  for (const [key, data] of byKey) {
    const servedCount = data.servedFarmerIds.size;
    const ratings = ratingsByKey.get(key);
    const ratedCount = ratings ? Number(ratings.farmer_count) : 0;

    entries.push({
      crop: data.crop,
      variety: data.variety,
      totalFarmersServed: servedCount,
      farmersRated: ratedCount,
      adoptionRate: totalFarmers > 0 ? Math.round((servedCount / totalFarmers) * 1000) / 10 : 0,
      reportingRate: servedCount > 0 ? Math.round((ratedCount / servedCount) * 1000) / 10 : 0,
      repeatRequestRate: servedCount > 0 ? Math.round((data.repeatFarmerCount / servedCount) * 1000) / 10 : 0,
      avgGerminationRating: ratings ? Math.round(Number(ratings.avg_germination) * 10) / 10 : null,
      avgYieldRating: ratings ? Math.round(Number(ratings.avg_yield) * 10) / 10 : null,
      avgOverallRating: ratings ? Math.round(Number(ratings.avg_overall) * 10) / 10 : null,
      ratingCount: ratings ? Number(ratings.rating_count) : 0,
    });
  }

  entries.sort((a, b) => b.adoptionRate - a.adoptionRate);
  return entries;
}
