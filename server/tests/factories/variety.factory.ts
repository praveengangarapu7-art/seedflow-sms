import { pool } from '../../src/db/pool';
import { createTestOrganization } from './organization.factory';
import { uniqueSuffix } from './ids';

export interface TestVariety {
  id: string;
  crop: string;
  variety_name: string;
  versionId: string;
}

export interface VarietyOverrides {
  crop?: string;
  varietyName?: string;
  botanicalName?: string;
  localNames?: string[];
  organizationId?: string;
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'deprecated';
  season?: string;
  agroClimaticSuitability?: string[];
  yieldBenchmarkPerAcre?: number;
  diseaseResistanceProfile?: { disease: string; resistanceLevel: string }[];
  marketDemandTrend?: 'rising' | 'stable' | 'declining';
  versionStatus?: 'draft' | 'issued' | 'superseded';
}

/**
 * Creates a variety AND its first version pre-set to `issued` by default —
 * the recommendation/search code only reads a variety's *latest issued*
 * version, so a bare draft-only fixture would silently be invisible to most
 * of the code under test unless the caller explicitly opts into that state.
 */
export async function createTestVariety(overrides: VarietyOverrides = {}): Promise<TestVariety> {
  const suffix = uniqueSuffix();
  const organizationId = overrides.organizationId ?? (await createTestOrganization()).id;
  const crop = overrides.crop ?? 'Paddy';
  const varietyName = overrides.varietyName ?? `TestVariety-${suffix}`;

  const varietyResult = await pool.query<{ id: string }>(
    `INSERT INTO varieties (crop, variety_name, botanical_name, local_names, organization_id, status, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'test-factory@example.com')
     RETURNING id`,
    [
      crop,
      varietyName,
      overrides.botanicalName ?? 'Oryza sativa',
      JSON.stringify(overrides.localNames ?? []),
      organizationId,
      overrides.status ?? 'approved',
    ],
  );
  const varietyId = varietyResult.rows[0].id;

  const versionResult = await pool.query<{ id: string }>(
    `INSERT INTO variety_versions (variety_id, version, status, season, agro_climatic_suitability, yield_benchmark_per_acre, disease_resistance_profile, market_demand_trend, submitted_by)
     VALUES ($1, 1, $2, $3, $4::jsonb, $5, $6::jsonb, $7, 'test-factory@example.com')
     RETURNING id`,
    [
      varietyId,
      overrides.versionStatus ?? 'issued',
      overrides.season ?? 'Kharif 2026',
      JSON.stringify(overrides.agroClimaticSuitability ?? []),
      overrides.yieldBenchmarkPerAcre ?? 2000,
      JSON.stringify(overrides.diseaseResistanceProfile ?? []),
      overrides.marketDemandTrend ?? 'stable',
    ],
  );

  return { id: varietyId, crop, variety_name: varietyName, versionId: versionResult.rows[0].id };
}
