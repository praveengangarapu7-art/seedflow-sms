import { pool } from '../../db/pool';
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
