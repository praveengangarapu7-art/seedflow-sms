import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { NotFoundError } from '../../errors';
import { insertAuditLog, type AuditLogEntry } from '../auditLogs/auditLogs.service';
import type { RegisterInput } from './users.types';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function findByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return result.rows[0] ?? null;
}

export async function findById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createUser(input: RegisterInput & { passwordHash: string }): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (email, password_hash, name, role, organization_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.email.toLowerCase(), input.passwordHash, input.name, input.role, input.organizationId ?? null],
  );
  return result.rows[0];
}

/* ------------------------------------------------------------------------ */
/* Administration                                                          */
/* ------------------------------------------------------------------------ */
/**
 * Everything below backs the Administration module's User Management page.
 * Until this was added the only way a user record could ever be created was
 * POST /auth/register and there was no way at all to list users, change a
 * role, or disable an account — so the platform had authentication but no
 * user administration. No migration is needed: the `users` table already
 * carries role, is_active and organization_id.
 *
 * Every mutation writes an audit_logs row inside the same transaction as
 * the change itself (the pattern insertAuditLog was built for), so an
 * account change can never be committed without its trail entry.
 */

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  organization_id: string | null;
  organization_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_action_at: string | null;
  action_count: number;
}

export interface ListUsersFilters {
  role?: string;
  organizationId?: string;
  isActive?: boolean;
  q?: string;
}

export async function listUsers(filters: ListUsersFilters = {}): Promise<AdminUserRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.role) {
    values.push(filters.role);
    conditions.push(`u.role = $${values.length}`);
  }
  if (filters.organizationId) {
    values.push(filters.organizationId);
    conditions.push(`u.organization_id = $${values.length}`);
  }
  if (typeof filters.isActive === 'boolean') {
    values.push(filters.isActive);
    conditions.push(`u.is_active = $${values.length}`);
  }
  if (filters.q) {
    values.push(`%${filters.q.toLowerCase()}%`);
    conditions.push(`(LOWER(u.name) LIKE $${values.length} OR LOWER(u.email) LIKE $${values.length})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // The audit-log join gives the admin an "is this account actually in use"
  // signal without a second round trip — the same data the System Health
  // page charts as user activity.
  const result = await pool.query<AdminUserRow>(
    `SELECT u.id,
            u.email,
            u.name,
            u.role,
            u.organization_id,
            o.name AS organization_name,
            u.is_active,
            u.created_at,
            u.updated_at,
            a.last_action_at,
            COALESCE(a.action_count, 0)::int AS action_count
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN (
            SELECT performed_by, MAX(created_at) AS last_action_at, COUNT(*) AS action_count
              FROM audit_logs
             GROUP BY performed_by
       ) a ON a.performed_by = u.email
       ${where}
       ORDER BY u.is_active DESC, u.created_at DESC`,
    values,
  );
  return result.rows;
}

export async function getAdminUserById(id: string): Promise<AdminUserRow | null> {
  const rows = await pool.query<AdminUserRow>(
    `SELECT u.id, u.email, u.name, u.role, u.organization_id, o.name AS organization_name,
            u.is_active, u.created_at, u.updated_at,
            NULL::timestamptz AS last_action_at, 0 AS action_count
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = $1`,
    [id],
  );
  return rows.rows[0] ?? null;
}

/** Aggregate counts for the Administration dashboard. */
export async function getUserStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byRole: { role: string; count: number }[];
  withoutOrganization: number;
}> {
  const [totals, byRole] = await Promise.all([
    pool.query<{ total: string; active: string; without_org: string }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_active) AS active,
              COUNT(*) FILTER (WHERE organization_id IS NULL) AS without_org
         FROM users`,
    ),
    pool.query<{ role: string; count: string }>(
      `SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY count DESC`,
    ),
  ]);
  const total = Number(totals.rows[0]?.total ?? 0);
  const active = Number(totals.rows[0]?.active ?? 0);
  return {
    total,
    active,
    inactive: total - active,
    withoutOrganization: Number(totals.rows[0]?.without_org ?? 0),
    byRole: byRole.rows.map((r) => ({ role: r.role, count: Number(r.count) })),
  };
}

async function withAudit<T>(
  fn: (client: PoolClient) => Promise<{ result: T; audit: AuditLogEntry }>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { result, audit } = await fn(client);
    await insertAuditLog(client, audit);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface AdminCreateUserInput {
  email: string;
  name: string;
  password: string;
  role: string;
  organizationId?: string | null;
}

export async function adminCreateUser(
  input: AdminCreateUserInput & { passwordHash: string },
  performedBy: string,
): Promise<UserRecord> {
  return withAudit(async (client) => {
    const inserted = await client.query<UserRecord>(
      `INSERT INTO users (email, password_hash, name, role, organization_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.email.toLowerCase(), input.passwordHash, input.name, input.role, input.organizationId ?? null],
    );
    const user = inserted.rows[0];
    return {
      result: user,
      audit: {
        entityType: 'user',
        entityId: user.id,
        action: 'USER_CREATED',
        performedBy,
        afterState: { email: user.email, name: user.name, role: user.role, organizationId: user.organization_id },
      },
    };
  });
}

export interface AdminUpdateUserInput {
  name?: string;
  role?: string;
  organizationId?: string | null;
  isActive?: boolean;
}

export async function adminUpdateUser(
  id: string,
  input: AdminUpdateUserInput,
  performedBy: string,
): Promise<UserRecord> {
  return withAudit(async (client) => {
    const existing = await client.query<UserRecord>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [id]);
    const before = existing.rows[0];
    if (!before) throw new NotFoundError(`User ${id} not found`);

    const updated = await client.query<UserRecord>(
      `UPDATE users
          SET name = COALESCE($2, name),
              role = COALESCE($3, role),
              organization_id = CASE WHEN $4::boolean THEN $5 ELSE organization_id END,
              is_active = COALESCE($6, is_active),
              updated_at = NOW()
        WHERE id = $1
      RETURNING *`,
      [
        id,
        input.name ?? null,
        input.role ?? null,
        input.organizationId !== undefined,
        input.organizationId ?? null,
        input.isActive ?? null,
      ],
    );
    const after = updated.rows[0];

    // The action name records WHAT changed, not just "updated", so the audit
    // trail is readable without diffing two JSON blobs by eye.
    const action =
      input.role && input.role !== before.role
        ? 'USER_ROLE_CHANGED'
        : input.isActive === false && before.is_active
          ? 'USER_DEACTIVATED'
          : input.isActive === true && !before.is_active
            ? 'USER_REACTIVATED'
            : 'USER_UPDATED';

    return {
      result: after,
      audit: {
        entityType: 'user',
        entityId: id,
        action,
        performedBy,
        beforeState: { name: before.name, role: before.role, organizationId: before.organization_id, isActive: before.is_active },
        afterState: { name: after.name, role: after.role, organizationId: after.organization_id, isActive: after.is_active },
      },
    };
  });
}

export async function adminResetPassword(id: string, passwordHash: string, performedBy: string): Promise<void> {
  await withAudit(async (client) => {
    const existing = await client.query<UserRecord>('SELECT * FROM users WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new NotFoundError(`User ${id} not found`);
    await client.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, passwordHash]);
    // Deliberately records only THAT a reset happened — never the password,
    // its hash, or any fragment of it.
    return {
      result: undefined,
      audit: {
        entityType: 'user',
        entityId: id,
        action: 'USER_PASSWORD_RESET',
        performedBy,
        metadata: { email: existing.rows[0].email },
      },
    };
  });
}
