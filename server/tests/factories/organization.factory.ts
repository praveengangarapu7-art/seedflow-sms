import { pool } from '../../src/db/pool';
import { uniqueSuffix } from './ids';

export interface TestOrganization {
  id: string;
  name: string;
  type: string;
}

export interface OrganizationOverrides {
  name?: string;
  type?: 'breeder' | 'producer' | 'laboratory' | 'certification_agency' | 'warehouse' | 'dealer' | 'government_authority';
}

export async function createTestOrganization(overrides: OrganizationOverrides = {}): Promise<TestOrganization> {
  const suffix = uniqueSuffix();
  const name = overrides.name ?? `Test Org ${suffix}`;
  const type = overrides.type ?? 'breeder';

  const result = await pool.query<TestOrganization>(
    `INSERT INTO organizations (name, type) VALUES ($1, $2) RETURNING id, name, type`,
    [name, type],
  );
  return result.rows[0];
}
