import { hashPassword } from '../../src/auth/password';
import { pool } from '../../src/db/pool';
import type { AuthenticatedUser } from '../../src/middleware/requireAuth';
import { createTestOrganization } from './organization.factory';
import { uniqueSuffix } from './ids';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  organizationId: string | null;
}

export interface UserOverrides {
  email?: string;
  password?: string;
  name?: string;
  role?: 'Admin' | 'Breeder' | 'Producer' | 'Inspector' | 'Warehouse Manager';
  organizationId?: string | null;
}

/**
 * Admin and Warehouse Manager are organization-agnostic in this system's
 * RBAC (see allocations.service.ts's OWNERSHIP_EXEMPT_ROLES); every other
 * role needs a real organization to act as, so one is created automatically
 * unless the caller passes organizationId explicitly (including null, to
 * opt out for a role that allows it).
 */
export async function createTestUser(overrides: UserOverrides = {}): Promise<TestUser> {
  const suffix = uniqueSuffix();
  const role = overrides.role ?? 'Admin';
  const email = overrides.email ?? `test-${suffix}@example.com`;
  const password = overrides.password ?? 'TestPass123!';
  const name = overrides.name ?? `Test User ${suffix}`;

  let organizationId: string | null;
  if ('organizationId' in overrides) {
    organizationId = overrides.organizationId ?? null;
  } else if (role === 'Admin' || role === 'Warehouse Manager') {
    organizationId = null;
  } else {
    organizationId = (await createTestOrganization()).id;
  }

  const passwordHash = await hashPassword(password);
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, role, organization_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [email, passwordHash, name, role, organizationId],
  );

  return { id: result.rows[0].id, email, password, name, role, organizationId };
}

/** Converts a factory-created user into the shape service functions expect as their `user` argument, bypassing HTTP for pure unit tests. */
export function asAuthenticatedUser(user: TestUser): AuthenticatedUser {
  return { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId };
}
