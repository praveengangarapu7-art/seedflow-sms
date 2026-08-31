import { pool } from '../../db/pool';
import type {
  SavedSearch,
  SeedLotSearchFilterOptions,
  SeedLotSearchFilters,
  SeedLotSearchResult,
} from './seedLotSearch.types';

/**
 * seed_lots.variety is a free-text string with no FK to the varieties
 * catalog (an established fact of this schema — every other module that
 * needs variety-level detail joins the same way, on crop+variety_name).
 * A lot whose variety was never registered in the catalog simply has no
 * agro-climatic/disease/yield data to show or filter on — that's expected,
 * not an error.
 */
export async function searchSeedLots(filters: SeedLotSearchFilters): Promise<SeedLotSearchResult[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  const push = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.q) {
    // Single free-text box: crop is normally an exact-match dropdown below,
    // but here it's ILIKE'd alongside variety and lot_code so a plain
    // ingredient-name search like "Tomato" surfaces every matching lot
    // without the caller needing to know it's a crop rather than a variety.
    const term = push(`%${filters.q}%`);
    conditions.push(`(sl.crop ILIKE ${term} OR sl.variety ILIKE ${term} OR sl.lot_code ILIKE ${term})`);
  }
  if (filters.variety) conditions.push(`sl.variety ILIKE ${push(`%${filters.variety}%`)}`);
  if (filters.crop) conditions.push(`sl.crop = ${push(filters.crop)}`);
  if (filters.seedClass) conditions.push(`sl.stage = ${push(filters.seedClass)}`);
  if (filters.sourceOrganizationId) conditions.push(`sl.organization_id = ${push(filters.sourceOrganizationId)}`);
  if (filters.productionDateFrom) conditions.push(`sl.production_date >= ${push(filters.productionDateFrom)}::date`);
  if (filters.productionDateTo) conditions.push(`sl.production_date <= ${push(filters.productionDateTo)}::date`);
  if (filters.minAvailableQuantity !== undefined) {
    conditions.push(`(sl.quantity_total - sl.quantity_allocated) >= ${push(filters.minAvailableQuantity)}`);
  }
  if (filters.storageZone) {
    conditions.push(`EXISTS (
      SELECT 1 FROM packaging_batches pb
      JOIN storage_assignments sa ON sa.packaging_batch_id = pb.id AND sa.status = 'active'
      JOIN storage_locations sloc ON sloc.id = sa.storage_location_id
      WHERE pb.seed_lot_id = sl.id AND sloc.warehouse_zone ILIKE ${push(`%${filters.storageZone}%`)}
    )`);
  }
  if (filters.certificationStatus === 'certified') {
    conditions.push(`EXISTS (SELECT 1 FROM quality_certificates qc WHERE qc.seed_lot_id = sl.id AND qc.status = 'issued')`);
  } else if (filters.certificationStatus === 'not_certified') {
    conditions.push(`NOT EXISTS (SELECT 1 FROM quality_certificates qc WHERE qc.seed_lot_id = sl.id AND qc.status = 'issued')`);
  }
  if (filters.testingStatus) conditions.push(`sl.testing_status = ${push(filters.testingStatus)}`);
  if (filters.agroClimaticZone) {
    conditions.push(`vc.agro_climatic_suitability @> ${push(JSON.stringify([filters.agroClimaticZone]))}::jsonb`);
  }
  if (filters.diseaseResistanceTrait) {
    conditions.push(`EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(vc.disease_resistance_profile, '[]'::jsonb)) elem
      WHERE elem->>'disease' ILIKE ${push(`%${filters.diseaseResistanceTrait}%`)}
    )`);
  }
  if (filters.minYieldBenchmark !== undefined) {
    conditions.push(`vc.yield_benchmark_per_acre >= ${push(filters.minYieldBenchmark)}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Opt-in and unbounded by default, same rationale as seedLots.service's
  // listSeedLots — this query is heavier per row (four LATERAL joins), so
  // it's even more exposed to the unbounded-result-set cost a load test
  // against a large dataset surfaced.
  let paginationClause = '';
  if (filters.limit !== undefined) {
    values.push(filters.limit);
    paginationClause += ` LIMIT $${values.length}`;
  }
  if (filters.offset !== undefined) {
    values.push(filters.offset);
    paginationClause += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(
    `SELECT sl.*,
            o.name AS organization_name,
            (sl.quantity_total - sl.quantity_allocated) AS quantity_available,
            vc.agro_climatic_suitability,
            vc.disease_resistance_profile,
            vc.yield_benchmark_per_acre,
            vc.yield_unit AS variety_yield_unit,
            qcert.cert_status AS latest_certificate_status,
            COALESCE(certified.is_certified, false) AS is_certified,
            COALESCE(storage.zones, ARRAY[]::text[]) AS storage_zones,
            COALESCE(storage.location_codes, ARRAY[]::text[]) AS storage_location_codes
     FROM seed_lots sl
     LEFT JOIN organizations o ON o.id = sl.organization_id
     LEFT JOIN LATERAL (
       SELECT vv.agro_climatic_suitability, vv.disease_resistance_profile, vv.yield_benchmark_per_acre, vv.yield_unit
       FROM varieties v
       JOIN variety_versions vv ON vv.variety_id = v.id
       WHERE v.crop = sl.crop AND v.variety_name = sl.variety
       ORDER BY vv.version DESC
       LIMIT 1
     ) vc ON true
     LEFT JOIN LATERAL (
       SELECT status AS cert_status FROM quality_certificates WHERE seed_lot_id = sl.id ORDER BY version DESC LIMIT 1
     ) qcert ON true
     LEFT JOIN LATERAL (
       SELECT true AS is_certified FROM quality_certificates WHERE seed_lot_id = sl.id AND status = 'issued' LIMIT 1
     ) certified ON true
     LEFT JOIN LATERAL (
       SELECT array_agg(DISTINCT sloc.warehouse_zone) AS zones, array_agg(DISTINCT sloc.code) AS location_codes
       FROM packaging_batches pb
       JOIN storage_assignments sa ON sa.packaging_batch_id = pb.id AND sa.status = 'active'
       JOIN storage_locations sloc ON sloc.id = sa.storage_location_id
       WHERE pb.seed_lot_id = sl.id
     ) storage ON true
     ${whereClause}
     ORDER BY sl.created_at DESC${paginationClause}`,
    values,
  );

  return result.rows.map((row) => ({
    ...row,
    quantity_total: Number(row.quantity_total),
    quantity_allocated: Number(row.quantity_allocated),
    quantity_available: Number(row.quantity_available),
    yield_benchmark_per_acre: row.yield_benchmark_per_acre != null ? Number(row.yield_benchmark_per_acre) : null,
  }));
}

export async function getSearchFilterOptions(): Promise<SeedLotSearchFilterOptions> {
  const [crops, organizations, zones, diseases, storageZones] = await Promise.all([
    pool.query<{ crop: string }>('SELECT DISTINCT crop FROM seed_lots ORDER BY crop'),
    pool.query<{ id: string; name: string }>(
      `SELECT DISTINCT o.id, o.name FROM organizations o JOIN seed_lots sl ON sl.organization_id = o.id ORDER BY o.name`,
    ),
    pool.query<{ zone: string }>(
      `SELECT DISTINCT jsonb_array_elements_text(agro_climatic_suitability) AS zone FROM variety_versions ORDER BY zone`,
    ),
    pool.query<{ disease: string }>(
      `SELECT DISTINCT elem->>'disease' AS disease
       FROM variety_versions, jsonb_array_elements(disease_resistance_profile) elem
       ORDER BY disease`,
    ),
    pool.query<{ warehouse_zone: string }>('SELECT DISTINCT warehouse_zone FROM storage_locations ORDER BY warehouse_zone'),
  ]);

  return {
    crops: crops.rows.map((r) => r.crop),
    organizations: organizations.rows,
    agroClimaticZones: zones.rows.map((r) => r.zone),
    diseaseTraits: diseases.rows.map((r) => r.disease),
    storageZones: storageZones.rows.map((r) => r.warehouse_zone),
  };
}

// --- Saved Searches (Extend #18 "Save Search" / "My Searches") -----------
// A saved search is just a name + the exact SeedLotSearchFilters object the
// user had active when they saved it, stored as opaque JSONB (see the
// migration for why). Scoped to the requesting user only.

export async function createSavedSearch(
  userId: string,
  name: string,
  filters: SeedLotSearchFilters,
): Promise<SavedSearch> {
  const result = await pool.query<SavedSearch>(
    `INSERT INTO saved_searches (user_id, name, filters)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, name) DO UPDATE SET filters = EXCLUDED.filters
     RETURNING id, name, filters, created_at`,
    [userId, name, JSON.stringify(filters)],
  );
  return result.rows[0];
}

export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
  const result = await pool.query<SavedSearch>(
    `SELECT id, name, filters, created_at FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function deleteSavedSearch(userId: string, id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM saved_searches WHERE id = $1 AND user_id = $2`, [id, userId]);
  return (result.rowCount ?? 0) > 0;
}
