// Archives old data out of the two partitioned log tables (migration 035)
// by detaching whole year-partitions and moving them into a separate
// `archive` schema — a metadata-only operation (no row-by-row copying),
// which is the actual point of partitioning by time in the first place.
// A detached partition keeps its data and can still be queried directly
// (`SELECT * FROM archive.audit_logs_2024`) or reattached later; it's just
// no longer part of the hot table's indexes/scans.
//
// Usage: tsx scripts/archiveOldPartitions.ts [yearsToRetain]
// With no argument, each table's own retention window is read from
// data_retention_policies (migration 036) instead of a shared constant —
// that table is the single source of truth for both this archival action
// and the farmer-anonymization retention policy. Passing an explicit
// yearsToRetain overrides both tables at once (used by tests and one-off
// manual runs).
import { fileURLToPath } from 'url';
import { pool } from '../src/db/pool';

const PARTITIONED_TABLES: { table: string; policyEntityType: string; fallbackDays: number }[] = [
  { table: 'audit_logs', policyEntityType: 'audit_log', fallbackDays: 730 },
  { table: 'api_request_metrics', policyEntityType: 'api_request_metric', fallbackDays: 365 },
];

async function retentionYearsFor(policyEntityType: string, fallbackDays: number): Promise<number> {
  const result = await pool.query<{ retention_days: number }>(
    `SELECT retention_days FROM data_retention_policies WHERE entity_type = $1 AND is_active = true`,
    [policyEntityType],
  );
  const days = result.rows[0]?.retention_days ?? fallbackDays;
  // Partitions are whole calendar years, so a retention window that isn't
  // an exact multiple of 365 days rounds UP — conservative, so a policy
  // change never archives data that's still (even partially) within its
  // configured retention window.
  return Math.ceil(days / 365);
}

interface PartitionInfo {
  partitionName: string;
  parentTable: string;
  rangeEndYear: number;
}

async function listYearPartitions(parentTable: string): Promise<PartitionInfo[]> {
  const result = await pool.query<{ partition_name: string; range_end: string | null }>(
    `SELECT
       child.relname AS partition_name,
       pg_get_expr(child.relpartbound, child.oid) AS bound_expr
     FROM pg_inherits
     JOIN pg_class parent ON parent.oid = pg_inherits.inhparent
     JOIN pg_class child ON child.oid = pg_inherits.inhrelid
     WHERE parent.relname = $1`,
    [parentTable],
  );

  const partitions: PartitionInfo[] = [];
  for (const row of result.rows as unknown as { partition_name: string; bound_expr: string }[]) {
    // Expression looks like: FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00')
    const match = row.bound_expr.match(/TO \('(\d{4})-/);
    if (!match) continue; // skips the DEFAULT partition, which has no upper bound to parse
    partitions.push({ partitionName: row.partition_name, parentTable, rangeEndYear: Number(match[1]) });
  }
  return partitions;
}

export async function archiveOldPartitions(overrideYearsToRetain?: number): Promise<{ archived: string[] }> {
  const currentYear = new Date().getFullYear();

  await pool.query('CREATE SCHEMA IF NOT EXISTS archive');

  const archived: string[] = [];
  for (const { table, policyEntityType, fallbackDays } of PARTITIONED_TABLES) {
    const yearsToRetain = overrideYearsToRetain ?? (await retentionYearsFor(policyEntityType, fallbackDays));
    const cutoffYear = currentYear - yearsToRetain + 1; // partitions ending before this are fully in the past

    const partitions = await listYearPartitions(table);
    for (const partition of partitions) {
      if (partition.rangeEndYear > cutoffYear) continue; // still within the retention window

      await pool.query(`ALTER TABLE ${table} DETACH PARTITION ${partition.partitionName}`);
      await pool.query(`ALTER TABLE ${partition.partitionName} SET SCHEMA archive`);
      archived.push(`archive.${partition.partitionName}`);
      console.log(`Archived ${table}'s ${partition.partitionName} -> archive.${partition.partitionName} (retaining ${yearsToRetain}y)`);
    }
  }

  if (archived.length === 0) {
    console.log('Nothing to archive — no partition is fully outside its configured retention window.');
  }
  return { archived };
}

async function main(): Promise<void> {
  const yearsArg = process.argv[2];
  const overrideYearsToRetain = yearsArg ? Number(yearsArg) : undefined;
  await archiveOldPartitions(overrideYearsToRetain);
  await pool.end();
}

// Only auto-run when executed directly (`tsx scripts/archiveOldPartitions.ts`),
// not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
