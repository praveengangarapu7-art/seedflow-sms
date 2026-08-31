import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: unknown;
}

/**
 * Writes an audit row using the caller's transaction client so the audit
 * entry commits or rolls back atomically with the change it describes.
 */
export async function insertAuditLog(client: PoolClient, entry: AuditLogEntry): Promise<void> {
  await client.query(
    `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, before_state, after_state, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.performedBy,
      entry.beforeState !== undefined ? JSON.stringify(entry.beforeState) : null,
      entry.afterState !== undefined ? JSON.stringify(entry.afterState) : null,
      entry.metadata !== undefined ? JSON.stringify(entry.metadata) : null,
    ],
  );
}

export async function listAuditLogs(filters: { entityType?: string; entityId?: string; limit?: number; offset?: number }) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.entityType) {
    values.push(filters.entityType);
    conditions.push(`entity_type = $${values.length}`);
  }
  if (filters.entityId) {
    values.push(filters.entityId);
    conditions.push(`entity_id = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit ?? 100, 500);
  values.push(limit);
  values.push(filters.offset ?? 0);

  const result = await pool.query(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return result.rows;
}
