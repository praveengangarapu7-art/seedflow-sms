import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { assertValidEmail } from '../../utils/validation';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type { CreateFarmerInput, FarmerRow, UpdateFarmerInput } from './farmers.types';

export async function listFarmers(filters: { region?: string; organizationId?: string }): Promise<FarmerRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.region) {
    values.push(filters.region);
    conditions.push(`region = $${values.length}`);
  }
  if (filters.organizationId) {
    values.push(filters.organizationId);
    conditions.push(`organization_id = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<FarmerRow>(`SELECT * FROM farmers ${whereClause} ORDER BY name ASC`, values);
  return result.rows;
}

export async function getFarmer(id: string): Promise<FarmerRow> {
  const result = await pool.query<FarmerRow>('SELECT * FROM farmers WHERE id = $1', [id]);
  const farmer = result.rows[0];
  if (!farmer) throw new NotFoundError(`Farmer ${id} not found`);
  return farmer;
}

export async function createFarmer(input: CreateFarmerInput, user: AuthenticatedUser): Promise<FarmerRow> {
  if (!input.name?.trim()) throw new ValidationError('name is required');
  if (!input.region?.trim()) throw new ValidationError('region is required');
  assertValidEmail(input.email);

  return withTransaction(async (client) => {
    const result = await client.query<FarmerRow>(
      `INSERT INTO farmers (name, phone, email, region, location, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        input.name.trim(),
        input.phone ?? null,
        input.email.trim(),
        input.region.trim(),
        input.location ?? null,
        input.organizationId ?? null,
      ],
    );
    const created = result.rows[0];

    // This was the one write path in the whole codebase that skipped
    // audit logging — every other mutation calls insertAuditLog.
    await insertAuditLog(client, {
      entityType: 'farmer',
      entityId: created.id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: created,
    });

    return created;
  });
}

export async function updateFarmer(id: string, input: UpdateFarmerInput, user: AuthenticatedUser): Promise<FarmerRow> {
  const existing = await getFarmer(id);

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const region = input.region !== undefined ? input.region.trim() : existing.region;
  if (!name) throw new ValidationError('name is required');
  if (!region) throw new ValidationError('region is required');

  const email = input.email !== undefined ? input.email : existing.email;
  assertValidEmail(email);

  const phone = input.phone !== undefined ? input.phone.trim() || null : existing.phone;
  const location = input.location !== undefined ? input.location.trim() || null : existing.location;
  const organizationId = input.organizationId !== undefined ? input.organizationId : existing.organization_id;

  return withTransaction(async (client) => {
    const result = await client.query<FarmerRow>(
      `UPDATE farmers SET name = $1, phone = $2, email = $3, region = $4, location = $5, organization_id = $6
       WHERE id = $7 RETURNING *`,
      [name, phone, (email as string).trim(), region, location, organizationId, id],
    );
    const updated = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'farmer',
      entityId: updated.id,
      action: 'UPDATE',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
    });

    return updated;
  });
}

export async function deleteFarmer(id: string, user: AuthenticatedUser): Promise<void> {
  const existing = await getFarmer(id);

  await withTransaction(async (client) => {
    await client.query('DELETE FROM farmers WHERE id = $1', [id]);
    await insertAuditLog(client, {
      entityType: 'farmer',
      entityId: id,
      action: 'DELETE',
      performedBy: user.email,
      beforeState: existing,
    });
  });
}
