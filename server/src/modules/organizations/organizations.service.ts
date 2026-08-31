import { pool } from '../../db/pool';
import { ValidationError, NotFoundError } from '../../errors';
import {
  ORGANIZATION_TYPES,
  type CreateOrganizationInput,
  type Organization,
  type UpdateOrganizationInput,
} from './organizations.types';

function assertValidType(type: string): void {
  if (!(ORGANIZATION_TYPES as readonly string[]).includes(type)) {
    throw new ValidationError(`type must be one of: ${ORGANIZATION_TYPES.join(', ')}`);
  }
}

// "Labs must have certification type" — only organizations registered as a
// laboratory carry this requirement; every other organization type leaves
// it optional/irrelevant.
function assertCertificationTypeIfLab(type: string, certificationType: string | null): void {
  if (type === 'laboratory' && !certificationType?.trim()) {
    throw new ValidationError('certificationType is required for a laboratory');
  }
}

export async function listOrganizations(filters: { type?: string } = {}): Promise<Organization[]> {
  if (filters.type) {
    const result = await pool.query<Organization>(
      'SELECT * FROM organizations WHERE type = $1 ORDER BY name ASC',
      [filters.type],
    );
    return result.rows;
  }
  const result = await pool.query<Organization>('SELECT * FROM organizations ORDER BY name ASC');
  return result.rows;
}

export async function getOrganizationById(id: string): Promise<Organization> {
  const result = await pool.query<Organization>('SELECT * FROM organizations WHERE id = $1', [id]);
  const organization = result.rows[0];
  if (!organization) throw new NotFoundError(`Organization ${id} not found`);
  return organization;
}

export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  if (!input.name?.trim()) throw new ValidationError('name is required');
  assertValidType(input.type);
  const certificationType = input.certificationType?.trim() || null;
  assertCertificationTypeIfLab(input.type, certificationType);

  const result = await pool.query<Organization>(
    `INSERT INTO organizations (name, type, location, contact_person, certification_type, active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      input.name.trim(),
      input.type,
      input.location?.trim() || null,
      input.contactPerson?.trim() || null,
      certificationType,
      input.active ?? true,
    ],
  );
  return result.rows[0];
}

export async function updateOrganization(id: string, input: UpdateOrganizationInput): Promise<Organization> {
  const existing = await getOrganizationById(id);

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const type = input.type !== undefined ? input.type : existing.type;
  if (!name) throw new ValidationError('name is required');
  assertValidType(type);

  const location = input.location !== undefined ? input.location.trim() || null : existing.location;
  const contactPerson =
    input.contactPerson !== undefined ? input.contactPerson.trim() || null : existing.contact_person;
  const certificationType =
    input.certificationType !== undefined ? input.certificationType.trim() || null : existing.certification_type;
  assertCertificationTypeIfLab(type, certificationType);
  const active = input.active !== undefined ? input.active : existing.active;

  const result = await pool.query<Organization>(
    `UPDATE organizations SET name = $1, type = $2, location = $3, contact_person = $4, certification_type = $5, active = $6
     WHERE id = $7 RETURNING *`,
    [name, type, location, contactPerson, certificationType, active, id],
  );
  return result.rows[0];
}

export async function deleteOrganization(id: string): Promise<void> {
  await getOrganizationById(id);
  await pool.query('DELETE FROM organizations WHERE id = $1', [id]);
}
