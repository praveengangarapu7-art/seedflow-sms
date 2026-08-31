import { pool } from '../../db/pool';
import { NotFoundError, ValidationError } from '../../errors';
import { CROP_CATEGORIES, CROP_SEASONS, type CreateCropInput, type Crop, type UpdateCropInput } from './crops.types';

function assertValidCategory(category: string): void {
  if (!(CROP_CATEGORIES as readonly string[]).includes(category)) {
    throw new ValidationError(`category must be one of: ${CROP_CATEGORIES.join(', ')}`);
  }
}

function assertValidSeason(season: string): void {
  if (!(CROP_SEASONS as readonly string[]).includes(season)) {
    throw new ValidationError(`season must be one of: ${CROP_SEASONS.join(', ')}`);
  }
}

export async function listCrops(filters: { active?: boolean } = {}): Promise<Crop[]> {
  if (filters.active !== undefined) {
    const result = await pool.query<Crop>('SELECT * FROM crops WHERE active = $1 ORDER BY name ASC', [filters.active]);
    return result.rows;
  }
  const result = await pool.query<Crop>('SELECT * FROM crops ORDER BY name ASC');
  return result.rows;
}

export async function getCropById(id: string): Promise<Crop> {
  const result = await pool.query<Crop>('SELECT * FROM crops WHERE id = $1', [id]);
  const crop = result.rows[0];
  if (!crop) throw new NotFoundError(`Crop ${id} not found`);
  return crop;
}

export async function createCrop(input: CreateCropInput): Promise<Crop> {
  if (!input.name?.trim()) throw new ValidationError('name is required');
  assertValidCategory(input.category);
  assertValidSeason(input.season);

  const result = await pool.query<Crop>(
    `INSERT INTO crops (name, category, season, active) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.name.trim(), input.category, input.season, input.active ?? true],
  );
  return result.rows[0];
}

export async function updateCrop(id: string, input: UpdateCropInput): Promise<Crop> {
  const existing = await getCropById(id);

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const category = input.category !== undefined ? input.category : existing.category;
  const season = input.season !== undefined ? input.season : existing.season;
  const active = input.active !== undefined ? input.active : existing.active;

  if (!name) throw new ValidationError('name is required');
  assertValidCategory(category);
  assertValidSeason(season);

  const result = await pool.query<Crop>(
    `UPDATE crops SET name = $1, category = $2, season = $3, active = $4 WHERE id = $5 RETURNING *`,
    [name, category, season, active, id],
  );
  return result.rows[0];
}

export async function deleteCrop(id: string): Promise<void> {
  await getCropById(id);
  await pool.query('DELETE FROM crops WHERE id = $1', [id]);
}
