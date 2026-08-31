import { pool } from '../../src/db/pool';
import { uniqueSuffix } from './ids';

export interface TestCrop {
  id: string;
  name: string;
  category: string;
  season: string;
  active: boolean;
}

export interface CropOverrides {
  name?: string;
  category?: string;
  season?: string;
  active?: boolean;
}

export async function createTestCrop(overrides: CropOverrides = {}): Promise<TestCrop> {
  const suffix = uniqueSuffix();
  const result = await pool.query<TestCrop>(
    `INSERT INTO crops (name, category, season, active) VALUES ($1, $2, $3, $4)
     RETURNING id, name, category, season, active`,
    [
      overrides.name ?? `Test Crop ${suffix}`,
      overrides.category ?? 'Food Grain',
      overrides.season ?? 'Kharif',
      overrides.active ?? true,
    ],
  );
  return result.rows[0];
}
