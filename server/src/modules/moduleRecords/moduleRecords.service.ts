import { createHash } from 'node:crypto';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ValidationError } from '../../errors';
import { insertAuditLog } from '../auditLogs/auditLogs.service';

/**
 * Generic, audited record store behind the modules that started on sample
 * data (see migration 059). The browser keeps the same array shape it always
 * had; it reads a whole collection and sends only what changed.
 */

const COLLECTION_RE = /^[a-z][a-z0-9_.-]{0,79}$/;
const MAX_BATCH = 2000;
const MAX_RECORD_BYTES = 200_000;
/** Above this many changes in one sync, one summary audit row is written instead of one per record. */
const AUDIT_DETAIL_LIMIT = 25;

export interface SyncInput {
  upserts?: unknown;
  deletes?: unknown;
  /** Starter data: only applied if this collection was never initialised. */
  seed?: unknown;
  /** Name of the person using the app (the front-end login), recorded in the audit log. */
  actor?: unknown;
}

export interface SyncResult {
  collection: string;
  seeded: boolean;
  upserted: number;
  deleted: number;
}

/**
 * audit_logs.entity_id is a UUID, so each (collection, record id) pair maps to
 * a stable name-based UUID; the readable ids are kept in the metadata.
 */
export function auditEntityId(collection: string, id: string): string {
  const h = createHash('sha1').update(`${collection}\u0000${id}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

const AUDIT_TYPE = 'module_record';

export function assertCollection(name: string): string {
  if (!COLLECTION_RE.test(name)) throw new ValidationError('Invalid collection name');
  return name;
}

function recordId(value: unknown): string {
  const id = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!id || id.length > 160) throw new ValidationError('Every record needs an id (max 160 characters)');
  return id;
}

interface UpsertItem { id: string; data: unknown; position: number | null }

function readUpserts(value: unknown): UpsertItem[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError('upserts must be an array');
  if (value.length > MAX_BATCH) throw new ValidationError(`At most ${MAX_BATCH} records per request`);
  return value.map((u) => {
    if (!u || typeof u !== 'object') throw new ValidationError('Each upsert needs { id, data }');
    const item = u as { id?: unknown; data?: unknown; position?: unknown };
    if (item.data === undefined || item.data === null || typeof item.data !== 'object') throw new ValidationError('Record data must be an object or array');
    if (JSON.stringify(item.data).length > MAX_RECORD_BYTES) throw new ValidationError('A record is too large');
    return { id: recordId(item.id), data: item.data, position: typeof item.position === 'number' && Number.isFinite(item.position) ? item.position : null };
  });
}

export async function listRecords(collection: string): Promise<{ collection: string; seeded: boolean; items: unknown[] }> {
  assertCollection(collection);
  const [rows, seeded] = await Promise.all([
    pool.query<{ data: unknown }>(
      `SELECT data FROM module_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY position, created_at`,
      [collection],
    ),
    pool.query(`SELECT 1 FROM module_collections WHERE collection = $1`, [collection]),
  ]);
  return { collection, seeded: (seeded.rowCount ?? 0) > 0, items: rows.rows.map((r) => r.data) };
}

export async function syncRecords(collection: string, input: SyncInput, user: { email: string }): Promise<SyncResult> {
  assertCollection(collection);
  const upserts = readUpserts(input.upserts);
  const seed = readUpserts(input.seed);
  if (input.deletes !== undefined && !Array.isArray(input.deletes)) throw new ValidationError('deletes must be an array');
  const deletes = ((input.deletes as unknown[]) ?? []).map(recordId);
  const actor = typeof input.actor === 'string' && input.actor.trim() ? input.actor.trim().slice(0, 150) : null;
  const who = actor ?? user.email;

  return withTransaction(async (client) => {
    let seeded = false;
    if (seed.length > 0) {
      // Lock the collection row so two browsers opening a page at once seed it only once.
      const claim = await client.query(
        `INSERT INTO module_collections (collection, seeded_by) VALUES ($1, $2) ON CONFLICT (collection) DO NOTHING`,
        [collection, who],
      );
      if ((claim.rowCount ?? 0) > 0) {
        for (const [i, s] of seed.entries()) {
          await client.query(
            `INSERT INTO module_records (collection, record_id, data, position, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $5) ON CONFLICT (collection, record_id) DO NOTHING`,
            [collection, s.id, JSON.stringify(s.data), s.position ?? i, who],
          );
        }
        seeded = true;
        await insertAuditLog(client, {
          entityType: AUDIT_TYPE, entityId: auditEntityId(collection, '*'), action: 'seed', performedBy: user.email,
          metadata: { collection, actor, records: seed.length },
        });
      }
    }

    const detailed = upserts.length + deletes.length <= AUDIT_DETAIL_LIMIT;
    for (const u of upserts) {
      const before = await client.query<{ data: unknown; deleted_at: string | null }>(
        `SELECT data, deleted_at FROM module_records WHERE collection = $1 AND record_id = $2 FOR UPDATE`,
        [collection, u.id],
      );
      const existing = before.rows[0];
      if (existing) {
        await client.query(
          `UPDATE module_records SET data = $3, version = version + 1, updated_by = $4, updated_at = NOW(), deleted_at = NULL,
                  position = COALESCE($5, position)
            WHERE collection = $1 AND record_id = $2`,
          [collection, u.id, JSON.stringify(u.data), who, u.position],
        );
      } else {
        // New records go to the top of the list unless the client gave a position.
        await client.query(
          `INSERT INTO module_records (collection, record_id, data, position, created_by, updated_by)
           VALUES ($1, $2, $3, COALESCE($4, -EXTRACT(EPOCH FROM clock_timestamp())), $5, $5)`,
          [collection, u.id, JSON.stringify(u.data), u.position, who],
        );
      }
      if (detailed) {
        await insertAuditLog(client, {
          entityType: AUDIT_TYPE, entityId: auditEntityId(collection, u.id),
          action: existing && !existing.deleted_at ? 'update' : 'create',
          performedBy: user.email, beforeState: existing && !existing.deleted_at ? existing.data : undefined, afterState: u.data, metadata: { collection, recordId: u.id, actor },
        });
      }
    }

    let deleted = 0;
    for (const id of deletes) {
      const res = await client.query<{ data: unknown }>(
        `UPDATE module_records SET deleted_at = NOW(), updated_by = $3, updated_at = NOW(), version = version + 1
          WHERE collection = $1 AND record_id = $2 AND deleted_at IS NULL RETURNING data`,
        [collection, id, who],
      );
      if (res.rowCount) {
        deleted += 1;
        if (detailed) {
          await insertAuditLog(client, {
            entityType: AUDIT_TYPE, entityId: auditEntityId(collection, id), action: 'delete', performedBy: user.email, beforeState: res.rows[0].data, metadata: { collection, recordId: id, actor },
          });
        }
      }
    }

    if (!detailed && (upserts.length || deleted)) {
      await insertAuditLog(client, {
        entityType: AUDIT_TYPE, entityId: auditEntityId(collection, '*'), action: 'bulk_update', performedBy: user.email,
        metadata: { collection, actor, upserted: upserts.length, deleted, ids: [...upserts.map((u) => u.id), ...deletes].slice(0, 100) },
      });
    }

    // Any write also marks the collection as initialised.
    if (!seeded && (upserts.length || deletes.length)) {
      await client.query(`INSERT INTO module_collections (collection, seeded_by) VALUES ($1, $2) ON CONFLICT (collection) DO NOTHING`, [collection, who]);
    }

    return { collection, seeded, upserted: upserts.length, deleted };
  });
}

export async function listCollections(): Promise<{ collection: string; records: number; updatedAt: string | null }[]> {
  const res = await pool.query<{ collection: string; records: number; updated_at: string | null }>(`
    SELECT c.collection, COUNT(r.record_id) FILTER (WHERE r.deleted_at IS NULL)::int AS records, MAX(r.updated_at) AS updated_at
      FROM module_collections c LEFT JOIN module_records r ON r.collection = c.collection
     GROUP BY c.collection ORDER BY c.collection`);
  return res.rows.map((r) => ({ collection: r.collection, records: r.records, updatedAt: r.updated_at }));
}
