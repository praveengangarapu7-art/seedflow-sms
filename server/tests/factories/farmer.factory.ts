import { pool } from '../../src/db/pool';
import { uniqueSuffix } from './ids';

export interface TestFarmer {
  id: string;
  name: string;
  region: string;
  organization_id: string | null;
}

export interface FarmerOverrides {
  name?: string;
  phone?: string;
  region?: string;
  location?: string;
  organizationId?: string | null;
}

export async function createTestFarmer(overrides: FarmerOverrides = {}): Promise<TestFarmer> {
  const suffix = uniqueSuffix();
  const result = await pool.query<TestFarmer>(
    `INSERT INTO farmers (name, phone, region, location, organization_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, region, organization_id`,
    [
      overrides.name ?? `Test Farmer ${suffix}`,
      overrides.phone ?? null,
      overrides.region ?? 'TestRegion',
      overrides.location ?? null,
      overrides.organizationId ?? null,
    ],
  );
  return result.rows[0];
}
