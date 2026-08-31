import type { PoolClient } from 'pg';
import { assertOwnsOrganization } from '../../auth/ownership';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import {
  COMMITTEE_ROLES,
  RESISTANCE_LEVELS,
  MARKET_DEMAND_TRENDS,
  type CreateNewVersionInput,
  type CreateVarietyInput,
  type DiseaseResistanceEntry,
  type ReviewVarietyInput,
  type UpdateVarietyDraftInput,
  type Variety,
  type VarietyVersion,
  type VarietyWithLatestVersion,
  type VarietyWithVersions,
  type CommitteeReview,
} from './varieties.types';

function resolveOwningOrganizationId(user: AuthenticatedUser, requestedOrganizationId?: string | null): string {
  if (user.role === 'Admin') {
    if (!requestedOrganizationId) {
      throw new ValidationError('organizationId is required when registering a variety as Admin');
    }
    return requestedOrganizationId;
  }
  if (!user.organizationId) {
    throw new ValidationError('Your account is not linked to an organization');
  }
  return user.organizationId;
}

function assertValidDiseaseResistanceProfile(entries: unknown): asserts entries is DiseaseResistanceEntry[] {
  if (!Array.isArray(entries)) throw new ValidationError('diseaseResistanceProfile must be an array');
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !('disease' in entry) || !('resistanceLevel' in entry)) {
      throw new ValidationError('Each diseaseResistanceProfile entry needs a disease and a resistanceLevel');
    }
    const { disease, resistanceLevel } = entry as { disease: unknown; resistanceLevel: unknown };
    if (typeof disease !== 'string' || !disease.trim()) {
      throw new ValidationError('Each diseaseResistanceProfile entry needs a non-empty disease name');
    }
    if (!RESISTANCE_LEVELS.includes(resistanceLevel as (typeof RESISTANCE_LEVELS)[number])) {
      throw new ValidationError(`resistanceLevel must be one of: ${RESISTANCE_LEVELS.join(', ')}`);
    }
  }
}

function assertValidStringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || !v.trim())) {
    throw new ValidationError(`${field} must be an array of non-empty strings`);
  }
}

function assertValidMarketDemandTrend(value: unknown): void {
  if (value !== undefined && !MARKET_DEMAND_TRENDS.includes(value as (typeof MARKET_DEMAND_TRENDS)[number])) {
    throw new ValidationError(`marketDemandTrend must be one of: ${MARKET_DEMAND_TRENDS.join(', ')}`);
  }
}

function mapVersionRow(row: any): VarietyVersion {
  return {
    id: row.id,
    variety_id: row.variety_id,
    version: row.version,
    status: row.status,
    season: row.season,
    agro_climatic_suitability: row.agro_climatic_suitability ?? [],
    yield_benchmark_per_acre: row.yield_benchmark_per_acre != null ? Number(row.yield_benchmark_per_acre) : null,
    yield_unit: row.yield_unit,
    disease_resistance_profile: row.disease_resistance_profile ?? [],
    market_demand_trend: row.market_demand_trend,
    notes: row.notes,
    submitted_by: row.submitted_by,
    created_at: row.created_at,
  };
}

async function insertVersion(
  client: PoolClient,
  varietyId: string,
  version: number,
  input: CreateVarietyInput | CreateNewVersionInput,
  user: AuthenticatedUser,
): Promise<VarietyVersion> {
  const agroClimaticSuitability = input.agroClimaticSuitability ?? [];
  const diseaseResistanceProfile = input.diseaseResistanceProfile ?? [];
  if (agroClimaticSuitability.length > 0) assertValidStringArray(agroClimaticSuitability, 'agroClimaticSuitability');
  if (diseaseResistanceProfile.length > 0) assertValidDiseaseResistanceProfile(diseaseResistanceProfile);
  assertValidMarketDemandTrend(input.marketDemandTrend);
  if (!input.season?.trim()) throw new ValidationError('season is required');

  const result = await client.query(
    `INSERT INTO variety_versions (variety_id, version, status, season, agro_climatic_suitability, yield_benchmark_per_acre, yield_unit, disease_resistance_profile, market_demand_trend, notes, submitted_by)
     VALUES ($1, $2, 'draft', $3, $4, $5, COALESCE($6, 'kg'), $7, $8, $9, $10)
     RETURNING *`,
    [
      varietyId,
      version,
      input.season.trim(),
      JSON.stringify(agroClimaticSuitability),
      input.yieldBenchmarkPerAcre ?? null,
      input.yieldUnit ?? null,
      JSON.stringify(diseaseResistanceProfile),
      input.marketDemandTrend ?? null,
      input.notes ?? null,
      user.email,
    ],
  );
  return mapVersionRow(result.rows[0]);
}

export async function createVariety(input: CreateVarietyInput, user: AuthenticatedUser): Promise<VarietyWithLatestVersion> {
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.varietyName?.trim()) throw new ValidationError('varietyName is required');
  if (!input.botanicalName?.trim()) throw new ValidationError('botanicalName is required');
  const localNames = input.localNames ?? [];
  if (localNames.length > 0) assertValidStringArray(localNames, 'localNames');

  const organizationId = resolveOwningOrganizationId(user, input.organizationId);

  const existing = await pool.query('SELECT id FROM varieties WHERE crop = $1 AND variety_name = $2', [
    input.crop.trim(),
    input.varietyName.trim(),
  ]);
  if (existing.rows.length > 0) {
    throw new ConflictError(`A variety named "${input.varietyName}" already exists for crop "${input.crop}"`);
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO varieties (crop, variety_name, botanical_name, local_names, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.crop.trim(), input.varietyName.trim(), input.botanicalName.trim(), JSON.stringify(localNames), organizationId, user.email],
    );
    const variety = mapVarietyRow(result.rows[0]);

    const version = await insertVersion(client, variety.id, 1, input, user);

    await insertAuditLog(client, {
      entityType: 'variety',
      entityId: variety.id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: { variety, version },
    });

    return { ...variety, latestVersion: version };
  });
}

function mapVarietyRow(row: any): Variety {
  return {
    id: row.id,
    crop: row.crop,
    variety_name: row.variety_name,
    botanical_name: row.botanical_name,
    local_names: row.local_names ?? [],
    organization_id: row.organization_id,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listVarieties(filters: { crop?: string; status?: string }): Promise<VarietyWithLatestVersion[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`v.crop = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`v.status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT v.*, row_to_json(lv.*) AS latest_version
     FROM varieties v
     LEFT JOIN LATERAL (
       SELECT * FROM variety_versions vv WHERE vv.variety_id = v.id ORDER BY vv.version DESC LIMIT 1
     ) lv ON true
     ${whereClause}
     ORDER BY v.crop, v.variety_name`,
    values,
  );

  return result.rows.map((row) => ({
    ...mapVarietyRow(row),
    latestVersion: row.latest_version ? mapVersionRow(row.latest_version) : null,
  }));
}

async function getVersionsWithReviews(varietyId: string) {
  const versionsResult = await pool.query('SELECT * FROM variety_versions WHERE variety_id = $1 ORDER BY version DESC', [
    varietyId,
  ]);
  const versions = versionsResult.rows.map(mapVersionRow);
  if (versions.length === 0) return [];

  const reviewsResult = await pool.query<CommitteeReview>(
    'SELECT * FROM variety_committee_reviews WHERE variety_version_id = ANY($1::uuid[]) ORDER BY reviewed_at ASC',
    [versions.map((v) => v.id)],
  );
  const reviewsByVersion = new Map<string, CommitteeReview[]>();
  for (const review of reviewsResult.rows) {
    const list = reviewsByVersion.get(review.variety_version_id) ?? [];
    list.push(review);
    reviewsByVersion.set(review.variety_version_id, list);
  }

  return versions.map((version) => ({ ...version, reviews: reviewsByVersion.get(version.id) ?? [] }));
}

export async function getVarietyById(id: string): Promise<VarietyWithVersions> {
  const result = await pool.query('SELECT * FROM varieties WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Variety ${id} not found`);

  const versions = await getVersionsWithReviews(id);
  return { ...mapVarietyRow(row), versions };
}

async function getLatestVersionForUpdate(client: PoolClient, varietyId: string): Promise<VarietyVersion | null> {
  const result = await client.query(
    'SELECT * FROM variety_versions WHERE variety_id = $1 ORDER BY version DESC LIMIT 1 FOR UPDATE',
    [varietyId],
  );
  return result.rows[0] ? mapVersionRow(result.rows[0]) : null;
}

export async function updateVarietyDraft(
  id: string,
  input: UpdateVarietyDraftInput,
  user: AuthenticatedUser,
): Promise<VarietyWithLatestVersion> {
  return withTransaction(async (client) => {
    const varietyResult = await client.query('SELECT * FROM varieties WHERE id = $1 FOR UPDATE', [id]);
    const existing = varietyResult.rows[0];
    if (!existing) throw new NotFoundError(`Variety ${id} not found`);
    const variety = mapVarietyRow(existing);
    assertOwnsOrganization(user, variety.organization_id, 'You can only edit varieties owned by your organization');

    if (variety.status !== 'draft' && variety.status !== 'rejected') {
      throw new ConflictError(`Variety is ${variety.status} — only a draft or rejected variety can be edited`);
    }

    const latestVersion = await getLatestVersionForUpdate(client, id);
    if (!latestVersion || latestVersion.status !== 'draft') {
      throw new ConflictError('No draft version available to edit');
    }

    if (input.localNames !== undefined) assertValidStringArray(input.localNames, 'localNames');
    if (input.agroClimaticSuitability !== undefined) assertValidStringArray(input.agroClimaticSuitability, 'agroClimaticSuitability');
    if (input.diseaseResistanceProfile !== undefined) assertValidDiseaseResistanceProfile(input.diseaseResistanceProfile);
    assertValidMarketDemandTrend(input.marketDemandTrend);

    let updatedVariety = variety;
    if (input.botanicalName !== undefined || input.localNames !== undefined) {
      const varietyUpdateResult = await client.query(
        `UPDATE varieties SET
           botanical_name = COALESCE($1, botanical_name),
           local_names = COALESCE($2, local_names),
           updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [input.botanicalName?.trim() ?? null, input.localNames !== undefined ? JSON.stringify(input.localNames) : null, id],
      );
      updatedVariety = mapVarietyRow(varietyUpdateResult.rows[0]);
    }

    const versionUpdateResult = await client.query(
      `UPDATE variety_versions SET
         season = COALESCE($1, season),
         agro_climatic_suitability = COALESCE($2, agro_climatic_suitability),
         yield_benchmark_per_acre = COALESCE($3::numeric, yield_benchmark_per_acre),
         yield_unit = COALESCE($4, yield_unit),
         disease_resistance_profile = COALESCE($5, disease_resistance_profile),
         market_demand_trend = COALESCE($6, market_demand_trend),
         notes = COALESCE($7, notes)
       WHERE id = $8
       RETURNING *`,
      [
        input.season?.trim() ?? null,
        input.agroClimaticSuitability !== undefined ? JSON.stringify(input.agroClimaticSuitability) : null,
        input.yieldBenchmarkPerAcre ?? null,
        input.yieldUnit ?? null,
        input.diseaseResistanceProfile !== undefined ? JSON.stringify(input.diseaseResistanceProfile) : null,
        input.marketDemandTrend ?? null,
        input.notes ?? null,
        latestVersion.id,
      ],
    );
    const updatedVersion = mapVersionRow(versionUpdateResult.rows[0]);

    await insertAuditLog(client, {
      entityType: 'variety',
      entityId: id,
      action: 'UPDATE_DRAFT',
      performedBy: user.email,
      beforeState: { variety, version: latestVersion },
      afterState: { variety: updatedVariety, version: updatedVersion },
    });

    return { ...updatedVariety, latestVersion: updatedVersion };
  });
}

/**
 * The quality gate for registration — a draft can be saved incomplete, but
 * committing it for breeding-committee review requires every trait the
 * catalog promises (agro-climatic fit, a real yield benchmark, disease
 * resistance data, market outlook) to actually be present.
 */
function assertReadyForReview(variety: Variety, version: VarietyVersion): void {
  const missing: string[] = [];
  if (!variety.botanical_name?.trim()) missing.push('botanical name');
  if (variety.local_names.length === 0) missing.push('at least one local name');
  if (!version.season?.trim()) missing.push('season');
  if (version.agro_climatic_suitability.length === 0) missing.push('at least one agro-climatic suitability zone');
  if (version.yield_benchmark_per_acre == null || version.yield_benchmark_per_acre <= 0) missing.push('a positive yield benchmark');
  if (version.disease_resistance_profile.length === 0) missing.push('at least one disease resistance entry');
  if (!version.market_demand_trend) missing.push('market demand trend');

  if (missing.length > 0) {
    throw new ValidationError(`Cannot submit for committee review — missing: ${missing.join(', ')}`);
  }
}

export async function submitForReview(id: string, user: AuthenticatedUser): Promise<VarietyWithLatestVersion> {
  return withTransaction(async (client) => {
    const varietyResult = await client.query('SELECT * FROM varieties WHERE id = $1 FOR UPDATE', [id]);
    const existing = varietyResult.rows[0];
    if (!existing) throw new NotFoundError(`Variety ${id} not found`);
    const variety = mapVarietyRow(existing);
    assertOwnsOrganization(user, variety.organization_id, 'You can only submit varieties owned by your organization');

    const latestVersion = await getLatestVersionForUpdate(client, id);
    if (!latestVersion || latestVersion.status !== 'draft') {
      throw new ConflictError('No draft version pending submission');
    }

    assertReadyForReview(variety, latestVersion);

    const result = await client.query(
      `UPDATE varieties SET status = 'pending_review', updated_at = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    const updated = mapVarietyRow(result.rows[0]);

    await insertAuditLog(client, {
      entityType: 'variety',
      entityId: id,
      action: 'SUBMIT_FOR_REVIEW',
      performedBy: user.email,
      beforeState: variety,
      afterState: updated,
      metadata: { versionId: latestVersion.id, version: latestVersion.version },
    });

    return { ...updated, latestVersion };
  });
}

export async function reviewVariety(
  id: string,
  input: ReviewVarietyInput,
  user: AuthenticatedUser,
): Promise<VarietyWithLatestVersion> {
  if (!COMMITTEE_ROLES.includes(user.role)) {
    throw new ForbiddenError(`Only the breeding committee (${COMMITTEE_ROLES.join(', ')}) can review varieties`);
  }

  return withTransaction(async (client) => {
    const varietyResult = await client.query('SELECT * FROM varieties WHERE id = $1 FOR UPDATE', [id]);
    const existing = varietyResult.rows[0];
    if (!existing) throw new NotFoundError(`Variety ${id} not found`);
    const variety = mapVarietyRow(existing);

    if (variety.status !== 'pending_review') {
      throw new ConflictError(`Variety is ${variety.status} — only a variety pending review can be reviewed`);
    }

    const latestVersion = await getLatestVersionForUpdate(client, id);
    if (!latestVersion) throw new ConflictError('No version found to review');

    if (latestVersion.submitted_by === user.email) {
      throw new ForbiddenError('You cannot review a variety version you submitted yourself');
    }

    await client.query(
      `INSERT INTO variety_committee_reviews (variety_version_id, reviewer, reviewer_role, decision, comments)
       VALUES ($1, $2, $3, $4, $5)`,
      [latestVersion.id, user.email, user.role, input.decision, input.comments?.trim() ?? null],
    );

    let newVarietyStatus: string;
    let versionUpdateQuery: string | null = null;

    if (input.decision === 'approved') {
      newVarietyStatus = 'approved';
      await client.query(
        `UPDATE variety_versions SET status = 'superseded' WHERE variety_id = $1 AND status = 'issued'`,
        [id],
      );
      versionUpdateQuery = `UPDATE variety_versions SET status = 'issued' WHERE id = $1`;
    } else if (input.decision === 'rejected') {
      newVarietyStatus = 'rejected';
    } else {
      newVarietyStatus = 'draft';
    }

    if (versionUpdateQuery) {
      await client.query(versionUpdateQuery, [latestVersion.id]);
    }

    const result = await client.query(`UPDATE varieties SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`, [
      newVarietyStatus,
      id,
    ]);
    const updated = mapVarietyRow(result.rows[0]);

    const finalVersionResult = await client.query('SELECT * FROM variety_versions WHERE id = $1', [latestVersion.id]);
    const finalVersion = mapVersionRow(finalVersionResult.rows[0]);

    await insertAuditLog(client, {
      entityType: 'variety',
      entityId: id,
      action: 'COMMITTEE_REVIEW',
      performedBy: user.email,
      beforeState: variety,
      afterState: updated,
      metadata: { decision: input.decision, comments: input.comments, versionId: latestVersion.id },
    });

    return { ...updated, latestVersion: finalVersion };
  });
}

export async function createNewVersion(
  id: string,
  input: CreateNewVersionInput,
  user: AuthenticatedUser,
): Promise<VarietyWithLatestVersion> {
  return withTransaction(async (client) => {
    const varietyResult = await client.query('SELECT * FROM varieties WHERE id = $1 FOR UPDATE', [id]);
    const existing = varietyResult.rows[0];
    if (!existing) throw new NotFoundError(`Variety ${id} not found`);
    const variety = mapVarietyRow(existing);
    assertOwnsOrganization(user, variety.organization_id, 'You can only version varieties owned by your organization');

    if (variety.status !== 'approved') {
      throw new ConflictError('Only an approved variety can receive a new season version');
    }

    const versionsResult = await client.query(
      'SELECT version FROM variety_versions WHERE variety_id = $1 ORDER BY version DESC LIMIT 1 FOR UPDATE',
      [id],
    );
    const nextVersion = (versionsResult.rows[0]?.version ?? 0) + 1;

    const version = await insertVersion(client, id, nextVersion, input, user);

    await insertAuditLog(client, {
      entityType: 'variety',
      entityId: id,
      action: 'CREATE_VERSION',
      performedBy: user.email,
      afterState: version,
      metadata: { version: nextVersion },
    });

    return { ...variety, latestVersion: version };
  });
}

export async function deprecateVariety(id: string, reason: string, user: AuthenticatedUser): Promise<Variety> {
  if (!reason?.trim()) throw new ValidationError('reason is required to deprecate a variety');

  return withTransaction(async (client) => {
    const varietyResult = await client.query('SELECT * FROM varieties WHERE id = $1 FOR UPDATE', [id]);
    const existing = varietyResult.rows[0];
    if (!existing) throw new NotFoundError(`Variety ${id} not found`);
    const variety = mapVarietyRow(existing);

    if (variety.status === 'deprecated') {
      throw new ConflictError('Variety is already deprecated');
    }

    const result = await client.query(`UPDATE varieties SET status = 'deprecated', updated_at = now() WHERE id = $1 RETURNING *`, [
      id,
    ]);
    const updated = mapVarietyRow(result.rows[0]);

    await insertAuditLog(client, {
      entityType: 'variety',
      entityId: id,
      action: 'DEPRECATE',
      performedBy: user.email,
      beforeState: variety,
      afterState: updated,
      metadata: { reason: reason.trim() },
    });

    return updated;
  });
}
