import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type {
  BreederPerformanceEntry,
  EnvironmentalAdaptationEntry,
  LotFieldInspectionRow,
  LotPerformanceEntry,
  PerformanceRating,
  RecordLotFieldInspectionInput,
} from './feedbackLoop.types';

export async function recordLotFieldInspection(
  input: RecordLotFieldInspectionInput,
  user: AuthenticatedUser,
): Promise<LotFieldInspectionRow> {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!Number.isInteger(Number(input.healthScore)) || Number(input.healthScore) < 0 || Number(input.healthScore) > 100) {
    throw new ValidationError('healthScore must be an integer between 0 and 100');
  }
  if (input.diseaseDetected && !input.diseaseName?.trim()) {
    throw new ValidationError('diseaseName is required when diseaseDetected is true');
  }
  if (input.pestDetected && !input.pestName?.trim()) {
    throw new ValidationError('pestName is required when pestDetected is true');
  }
  if (!input.inspectionDate) throw new ValidationError('inspectionDate is required');

  const lotResult = await pool.query("SELECT id FROM seed_lots WHERE id = $1 AND stage = 'Certified'", [input.seedLotId]);
  if (lotResult.rows.length === 0) {
    throw new ValidationError('Field inspections can only be recorded against a Certified-stage seed lot');
  }

  return withTransaction(async (client) => {
    const result = await client.query<LotFieldInspectionRow>(
      `INSERT INTO lot_field_inspections (seed_lot_id, farmer_id, seed_request_id, health_score, disease_detected, disease_name, pest_detected, pest_name, environmental_notes, inspection_date, recorded_by, photo_data_url, gps_latitude, gps_longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        input.seedLotId,
        input.farmerId ?? null,
        input.seedRequestId ?? null,
        input.healthScore,
        input.diseaseDetected,
        input.diseaseDetected ? input.diseaseName!.trim() : null,
        input.pestDetected ?? false,
        input.pestDetected ? input.pestName!.trim() : null,
        input.environmentalNotes ?? null,
        input.inspectionDate,
        user.email,
        input.photoDataUrl ?? null,
        input.gpsLatitude ?? null,
        input.gpsLongitude ?? null,
      ],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'lot_field_inspection',
      entityId: row.id,
      action: 'RECORD',
      performedBy: user.email,
      afterState: row,
      metadata: { seedLotId: input.seedLotId },
    });

    return row;
  });
}

export async function listLotFieldInspections(filters: {
  seedLotId?: string;
  farmerId?: string;
}): Promise<LotFieldInspectionRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.seedLotId) {
    values.push(filters.seedLotId);
    conditions.push(`seed_lot_id = $${values.length}`);
  }
  if (filters.farmerId) {
    values.push(filters.farmerId);
    conditions.push(`farmer_id = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<LotFieldInspectionRow>(
    `SELECT * FROM lot_field_inspections ${whereClause} ORDER BY inspection_date DESC`,
    values,
  );
  return result.rows;
}

function rate(rating: { avgHealthScore: number | null; diseaseIncidenceRate: number | null; inspectionCount: number }): PerformanceRating {
  if (rating.inspectionCount === 0 || rating.avgHealthScore == null || rating.diseaseIncidenceRate == null) {
    return 'insufficient_data';
  }
  if (rating.avgHealthScore >= 80 && rating.diseaseIncidenceRate <= 20) return 'high';
  if (rating.avgHealthScore >= 60 && rating.diseaseIncidenceRate <= 40) return 'moderate';
  return 'low';
}

async function getGerminationByLot(): Promise<Map<string, number>> {
  const result = await pool.query<{ seed_lot_id: string; total_sample: string; total_germinated: string }>(
    'SELECT seed_lot_id, SUM(sample_size) AS total_sample, SUM(germinated_count) AS total_germinated FROM germination_tests GROUP BY seed_lot_id',
  );
  const map = new Map<string, number>();
  for (const row of result.rows) {
    const totalSample = Number(row.total_sample);
    if (totalSample > 0) {
      map.set(row.seed_lot_id, Math.round((Number(row.total_germinated) / totalSample) * 1000) / 10);
    }
  }
  return map;
}

/**
 * Which Certified lots actually performed well in the field — health score
 * and disease incidence from lot_field_inspections, cross-referenced with
 * the lot's real germination_tests rate, not a separate estimate.
 */
export async function getLotPerformanceReport(): Promise<LotPerformanceEntry[]> {
  const result = await pool.query<{
    seed_lot_id: string;
    lot_code: string;
    crop: string;
    variety: string;
    inspection_count: string;
    avg_health: string | null;
    disease_count: string;
  }>(
    `SELECT sl.id AS seed_lot_id, sl.lot_code, sl.crop, sl.variety,
            COUNT(fi.id)::int AS inspection_count,
            AVG(fi.health_score) AS avg_health,
            COUNT(*) FILTER (WHERE fi.disease_detected)::int AS disease_count
     FROM seed_lots sl
     LEFT JOIN lot_field_inspections fi ON fi.seed_lot_id = sl.id
     WHERE sl.stage = 'Certified'
     GROUP BY sl.id, sl.lot_code, sl.crop, sl.variety
     ORDER BY sl.lot_code`,
  );

  const germinationByLot = await getGerminationByLot();

  return result.rows.map((row) => {
    const inspectionCount = Number(row.inspection_count);
    const avgHealthScore = row.avg_health != null ? Math.round(Number(row.avg_health) * 10) / 10 : null;
    const diseaseIncidenceRate =
      inspectionCount > 0 ? Math.round((Number(row.disease_count) / inspectionCount) * 1000) / 10 : null;

    return {
      seedLotId: row.seed_lot_id,
      lotCode: row.lot_code,
      crop: row.crop,
      variety: row.variety,
      inspectionCount,
      avgHealthScore,
      diseaseIncidenceRate,
      avgGerminationRate: germinationByLot.get(row.seed_lot_id) ?? null,
      performanceRating: rate({ avgHealthScore, diseaseIncidenceRate, inspectionCount }),
    };
  });
}

/**
 * Traces every Certified lot back to its Breeder-stage ancestor's
 * organization (only when that organization is genuinely type='breeder' —
 * the same "stage describes the seed, not who owns it" caveat as demand
 * planning's PO routing) in a single recursive query, then rolls field
 * performance up to the breeder that originated the germplasm.
 */
export async function getBreederPerformanceReport(): Promise<BreederPerformanceEntry[]> {
  const lineageResult = await pool.query<{ certified_lot_id: string; breeder_org_id: string; breeder_org_name: string }>(
    `WITH RECURSIVE ancestry AS (
       SELECT id, id AS certified_lot_id, parent_lot_id, stage, organization_id
       FROM seed_lots WHERE stage = 'Certified'
       UNION ALL
       SELECT sl.id, a.certified_lot_id, sl.parent_lot_id, sl.stage, sl.organization_id
       FROM seed_lots sl
       JOIN ancestry a ON sl.id = a.parent_lot_id
     )
     SELECT a.certified_lot_id, a.organization_id AS breeder_org_id, o.name AS breeder_org_name
     FROM ancestry a
     JOIN organizations o ON o.id = a.organization_id AND o.type = 'breeder'
     WHERE a.stage = 'Breeder'`,
  );
  const breederByLot = new Map(lineageResult.rows.map((row) => [row.certified_lot_id, row]));

  const lotPerformance = await getLotPerformanceReport();
  const germinationByLot = await getGerminationByLot();

  const byBreeder = new Map<
    string,
    { organizationName: string; lotIds: Set<string>; inspectionCount: number; healthTotal: number; diseaseCount: number; germinationSum: number; germinationLotCount: number }
  >();

  for (const lot of lotPerformance) {
    const lineage = breederByLot.get(lot.seedLotId);
    if (!lineage) continue; // no traceable breeder org for this lot

    const entry = byBreeder.get(lineage.breeder_org_id) ?? {
      organizationName: lineage.breeder_org_name,
      lotIds: new Set<string>(),
      inspectionCount: 0,
      healthTotal: 0,
      diseaseCount: 0,
      germinationSum: 0,
      germinationLotCount: 0,
    };
    entry.lotIds.add(lot.seedLotId);
    entry.inspectionCount += lot.inspectionCount;
    if (lot.avgHealthScore != null) entry.healthTotal += lot.avgHealthScore * lot.inspectionCount;
    if (lot.diseaseIncidenceRate != null) entry.diseaseCount += (lot.diseaseIncidenceRate / 100) * lot.inspectionCount;
    const germinationRate = germinationByLot.get(lot.seedLotId);
    if (germinationRate != null) {
      entry.germinationSum += germinationRate;
      entry.germinationLotCount += 1;
    }
    byBreeder.set(lineage.breeder_org_id, entry);
  }

  return Array.from(byBreeder.entries()).map(([organizationId, entry]) => ({
    breederOrganizationId: organizationId,
    breederOrganizationName: entry.organizationName,
    lotCount: entry.lotIds.size,
    inspectionCount: entry.inspectionCount,
    avgHealthScore: entry.inspectionCount > 0 ? Math.round((entry.healthTotal / entry.inspectionCount) * 10) / 10 : null,
    diseaseIncidenceRate:
      entry.inspectionCount > 0 ? Math.round((entry.diseaseCount / entry.inspectionCount) * 1000) / 10 : null,
    avgGerminationRate:
      entry.germinationLotCount > 0 ? Math.round((entry.germinationSum / entry.germinationLotCount) * 10) / 10 : null,
  }));
}

/**
 * How a variety performs across regions — only inspections linked to a
 * farmer (and therefore a region) can contribute here.
 */
export async function getEnvironmentalAdaptation(): Promise<EnvironmentalAdaptationEntry[]> {
  const result = await pool.query<{
    crop: string;
    variety: string;
    region: string;
    inspection_count: string;
    avg_health: string | null;
    disease_count: string;
  }>(
    `SELECT sl.crop, sl.variety, f.region,
            COUNT(fi.id)::int AS inspection_count,
            AVG(fi.health_score) AS avg_health,
            COUNT(*) FILTER (WHERE fi.disease_detected)::int AS disease_count
     FROM lot_field_inspections fi
     JOIN seed_lots sl ON sl.id = fi.seed_lot_id
     JOIN farmers f ON f.id = fi.farmer_id
     GROUP BY sl.crop, sl.variety, f.region
     ORDER BY sl.crop, sl.variety, f.region`,
  );

  return result.rows.map((row) => {
    const inspectionCount = Number(row.inspection_count);
    return {
      crop: row.crop,
      variety: row.variety,
      region: row.region,
      inspectionCount,
      avgHealthScore: row.avg_health != null ? Math.round(Number(row.avg_health) * 10) / 10 : null,
      diseaseIncidenceRate: inspectionCount > 0 ? Math.round((Number(row.disease_count) / inspectionCount) * 1000) / 10 : null,
    };
  });
}
