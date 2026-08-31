import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import {
  CROP_VARIETY_APPROVER_ROLES,
  type CreateCropVarietyInput,
  type CropVariety,
  type RejectCropVarietyInput,
  type UpdateCropVarietyInput,
} from './cropVarieties.types';

function mapRow(row: any): CropVariety {
  return {
    id: row.id,
    name: row.name,
    crop: row.crop,
    description: row.description,
    category: row.category,
    breeder_organization_id: row.breeder_organization_id,
    status: row.status,
    created_by: row.created_by,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function assertUnique(crop: string, name: string, excludeId?: string): Promise<void> {
  const result = await pool.query(
    excludeId
      ? 'SELECT id FROM crop_varieties WHERE crop = $1 AND name = $2 AND id != $3'
      : 'SELECT id FROM crop_varieties WHERE crop = $1 AND name = $2',
    excludeId ? [crop, name, excludeId] : [crop, name],
  );
  if (result.rows.length > 0) {
    throw new ConflictError(`A variety named "${name}" already exists for crop "${crop}"`);
  }
}

export async function createCropVariety(input: CreateCropVarietyInput, user: AuthenticatedUser): Promise<CropVariety> {
  if (!input.name?.trim()) throw new ValidationError('name is required');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');

  const name = input.name.trim();
  const crop = input.crop.trim();
  await assertUnique(crop, name);

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO crop_varieties (name, crop, description, category, breeder_organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, crop, input.description?.trim() || null, input.category?.trim() || null, input.breederOrganizationId || null, user.email],
    );
    const variety = mapRow(result.rows[0]);

    await insertAuditLog(client, {
      entityType: 'crop_variety',
      entityId: variety.id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: variety,
    });

    return variety;
  });
}

export async function listCropVarieties(filters: { crop?: string; status?: string }): Promise<CropVariety[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(`SELECT * FROM crop_varieties ${whereClause} ORDER BY crop, name`, values);
  return result.rows.map(mapRow);
}

export async function getCropVarietyById(id: string): Promise<CropVariety> {
  const result = await pool.query('SELECT * FROM crop_varieties WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Crop variety ${id} not found`);
  return mapRow(row);
}

export async function updateCropVariety(
  id: string,
  input: UpdateCropVarietyInput,
  user: AuthenticatedUser,
): Promise<CropVariety> {
  return withTransaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM crop_varieties WHERE id = $1 FOR UPDATE', [id]);
    const existingRow = existingResult.rows[0];
    if (!existingRow) throw new NotFoundError(`Crop variety ${id} not found`);
    const existing = mapRow(existingRow);

    // Once approved, only an Admin may still change it (a correction) —
    // everyone else must go through the draft/review cycle again.
    if (existing.status === 'approved' && user.role !== 'Admin') {
      throw new ForbiddenError('Only an Admin can edit an approved variety');
    }

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const crop = input.crop !== undefined ? input.crop.trim() : existing.crop;
    if (!name) throw new ValidationError('name is required');
    if (!crop) throw new ValidationError('crop is required');
    if (name !== existing.name || crop !== existing.crop) {
      await assertUnique(crop, name, id);
    }

    const result = await client.query(
      `UPDATE crop_varieties SET
         name = $1,
         crop = $2,
         description = $3,
         category = $4,
         breeder_organization_id = $5
       WHERE id = $6
       RETURNING *`,
      [
        name,
        crop,
        input.description !== undefined ? input.description.trim() || null : existing.description,
        input.category !== undefined ? input.category.trim() || null : existing.category,
        input.breederOrganizationId !== undefined ? input.breederOrganizationId : existing.breeder_organization_id,
        id,
      ],
    );
    const updated = mapRow(result.rows[0]);

    await insertAuditLog(client, {
      entityType: 'crop_variety',
      entityId: id,
      action: 'UPDATE',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
    });

    return updated;
  });
}

export async function submitCropVarietyForReview(id: string, user: AuthenticatedUser): Promise<CropVariety> {
  return withTransaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM crop_varieties WHERE id = $1 FOR UPDATE', [id]);
    const existingRow = existingResult.rows[0];
    if (!existingRow) throw new NotFoundError(`Crop variety ${id} not found`);
    const existing = mapRow(existingRow);

    if (existing.status !== 'draft') {
      throw new ConflictError(`Variety is ${existing.status} — only a draft variety can be submitted for review`);
    }

    const result = await client.query(
      `UPDATE crop_varieties SET status = 'reviewed', reviewed_by = $1, reviewed_at = now(), rejection_reason = NULL WHERE id = $2 RETURNING *`,
      [user.email, id],
    );
    const updated = mapRow(result.rows[0]);

    await insertAuditLog(client, {
      entityType: 'crop_variety',
      entityId: id,
      action: 'SUBMIT_FOR_REVIEW',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
    });

    return updated;
  });
}

/**
 * Admin-only sign-off. An Admin may approve straight from `draft` (skipping
 * the formal review queue — they don't need to review-then-approve as two
 * separate clicks) or from `reviewed`. Anyone else must use
 * submitCropVarietyForReview to move it into the queue first.
 */
export async function approveCropVariety(id: string, user: AuthenticatedUser): Promise<CropVariety> {
  if (!CROP_VARIETY_APPROVER_ROLES.includes(user.role)) {
    throw new ForbiddenError(`Only ${CROP_VARIETY_APPROVER_ROLES.join(', ')} can approve a variety`);
  }

  return withTransaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM crop_varieties WHERE id = $1 FOR UPDATE', [id]);
    const existingRow = existingResult.rows[0];
    if (!existingRow) throw new NotFoundError(`Crop variety ${id} not found`);
    const existing = mapRow(existingRow);

    if (existing.status === 'approved') {
      throw new ConflictError('Variety is already approved');
    }

    const result = await client.query(
      `UPDATE crop_varieties SET
         status = 'approved',
         reviewed_by = COALESCE(reviewed_by, $1),
         reviewed_at = COALESCE(reviewed_at, now()),
         approved_by = $1,
         approved_at = now(),
         rejection_reason = NULL
       WHERE id = $2
       RETURNING *`,
      [user.email, id],
    );
    const updated = mapRow(result.rows[0]);

    await insertAuditLog(client, {
      entityType: 'crop_variety',
      entityId: id,
      action: 'APPROVE',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
    });

    return updated;
  });
}

export async function rejectCropVariety(
  id: string,
  input: RejectCropVarietyInput,
  user: AuthenticatedUser,
): Promise<CropVariety> {
  if (!CROP_VARIETY_APPROVER_ROLES.includes(user.role)) {
    throw new ForbiddenError(`Only ${CROP_VARIETY_APPROVER_ROLES.join(', ')} can reject a variety`);
  }
  if (!input.reason?.trim()) throw new ValidationError('reason is required to reject a variety');

  return withTransaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM crop_varieties WHERE id = $1 FOR UPDATE', [id]);
    const existingRow = existingResult.rows[0];
    if (!existingRow) throw new NotFoundError(`Crop variety ${id} not found`);
    const existing = mapRow(existingRow);

    if (existing.status !== 'reviewed') {
      throw new ConflictError(`Variety is ${existing.status} — only a variety pending review can be rejected`);
    }

    const result = await client.query(
      `UPDATE crop_varieties SET status = 'draft', rejection_reason = $1 WHERE id = $2 RETURNING *`,
      [input.reason.trim(), id],
    );
    const updated = mapRow(result.rows[0]);

    await insertAuditLog(client, {
      entityType: 'crop_variety',
      entityId: id,
      action: 'REJECT',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
      metadata: { reason: input.reason.trim() },
    });

    return updated;
  });
}

export async function deleteCropVariety(id: string, user: AuthenticatedUser): Promise<void> {
  return withTransaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM crop_varieties WHERE id = $1 FOR UPDATE', [id]);
    const existingRow = existingResult.rows[0];
    if (!existingRow) throw new NotFoundError(`Crop variety ${id} not found`);
    const existing = mapRow(existingRow);

    if (existing.status === 'approved') {
      throw new ConflictError('An approved variety cannot be deleted — reject or revert it first');
    }

    await client.query('DELETE FROM crop_varieties WHERE id = $1', [id]);

    await insertAuditLog(client, {
      entityType: 'crop_variety',
      entityId: id,
      action: 'DELETE',
      performedBy: user.email,
      beforeState: existing,
    });
  });
}
