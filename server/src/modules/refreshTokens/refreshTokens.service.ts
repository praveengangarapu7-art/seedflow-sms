import { pool } from '../../db/pool';
import { env } from '../../config/env';
import { generateOpaqueToken, hashToken } from '../../auth/tokens';

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  replaced_by_id: string | null;
  user_agent: string | null;
  created_at: string;
}

export async function createRefreshToken(
  userId: string,
  userAgent?: string,
): Promise<{ rawToken: string; record: RefreshTokenRecord }> {
  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  const result = await pool.query<RefreshTokenRecord>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, tokenHash, expiresAt.toISOString(), userAgent ?? null],
  );

  return { rawToken, record: result.rows[0] };
}

export async function findValidRefreshToken(rawToken: string): Promise<RefreshTokenRecord | null> {
  const tokenHash = hashToken(rawToken);
  const result = await pool.query<RefreshTokenRecord>(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()',
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function revokeRefreshToken(id: string, replacedById?: string): Promise<void> {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now(), replaced_by_id = COALESCE($2, replaced_by_id) WHERE id = $1',
    [id, replacedById ?? null],
  );
}
