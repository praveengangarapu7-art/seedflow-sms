import { beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { archiveOldPartitions } from '../../scripts/archiveOldPartitions';

async function isPartitionAttached(parentTable: string, partitionName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM pg_inherits
     JOIN pg_class parent ON parent.oid = pg_inherits.inhparent
     JOIN pg_class child ON child.oid = pg_inherits.inhrelid
     WHERE parent.relname = $1 AND child.relname = $2`,
    [parentTable, partitionName],
  );
  return result.rows.length > 0;
}

/**
 * DETACH PARTITION is not something a test can just redo every run without
 * cleanup — a previous run leaves audit_logs_2024 sitting in the archive
 * schema, not attached to audit_logs anymore. This restores the "before"
 * state first so the test is repeatable, matching how a real operator would
 * reattach a partition if they needed to (ALTER TABLE ... SET SCHEMA public
 * + ATTACH PARTITION, the exact inverse of what archiveOldPartitions does).
 */
async function ensurePartitionAttached(parentTable: string, partitionName: string, from: string, to: string): Promise<void> {
  if (await isPartitionAttached(parentTable, partitionName)) return;
  await pool.query(`ALTER TABLE archive.${partitionName} SET SCHEMA public`);
  await pool.query(`ALTER TABLE ${parentTable} ATTACH PARTITION ${partitionName} FOR VALUES FROM ('${from}') TO ('${to}')`);
}

describe('archiveOldPartitions', () => {
  beforeAll(async () => {
    await ensurePartitionAttached('audit_logs', 'audit_logs_2024', '2024-01-01', '2025-01-01');
    await ensurePartitionAttached('api_request_metrics', 'api_request_metrics_2024', '2024-01-01', '2025-01-01');
  });

  it('detaches a fully-past partition into the archive schema with its data intact, leaving current data untouched', async () => {
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, created_at)
       VALUES ('seed_lot', gen_random_uuid(), 'CREATE', 'archival-test@example.com', '2024-06-15 10:00:00+00')`,
    );

    const currentCountBefore = await pool.query(`SELECT COUNT(*)::int AS count FROM audit_logs WHERE created_at >= '2026-01-01'`);

    const { archived } = await archiveOldPartitions(2);

    expect(archived).toContain('archive.audit_logs_2024');

    const stillAttached = await isPartitionAttached('audit_logs', 'audit_logs_2024');
    expect(stillAttached).toBe(false);

    const archivedRows = await pool.query(`SELECT performed_by FROM archive.audit_logs_2024`);
    expect(archivedRows.rows.some((r) => r.performed_by === 'archival-test@example.com')).toBe(true);

    const currentCountAfter = await pool.query(`SELECT COUNT(*)::int AS count FROM audit_logs WHERE created_at >= '2026-01-01'`);
    expect(currentCountAfter.rows[0].count).toBe(currentCountBefore.rows[0].count);
  });

  it('is a no-op when nothing is old enough to archive', async () => {
    const { archived } = await archiveOldPartitions(20); // retain 20 years — nothing qualifies
    expect(archived).toEqual([]);
  });
});
