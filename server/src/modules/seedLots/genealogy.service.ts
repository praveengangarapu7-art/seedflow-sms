import type { QueryResult } from 'pg';
import { pool } from '../../db/pool';
import { NotFoundError } from '../../errors';
import type { SeedLotAllocation } from '../allocations/allocations.types';
import { withAvailability, type SeedLot, type SeedLotWithAvailability } from './seedLots.types';

export interface GenealogyAuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  before_state: unknown;
  after_state: unknown;
  metadata: unknown;
  created_at: string;
}

// A compact view of a lab test submission for the genealogy tree's "Test"
// step — deliberately not the full LabTestSubmissionWithResults shape (see
// server/src/modules/labTesting): the tree only needs enough to render a
// pass/fail summary per node, not the full metrics/audit detail, which is
// still available from the lab-testing endpoints for anyone who needs it.
export interface GenealogyTestResultSummary {
  test_type: string;
  result_value: number;
  threshold_used: number;
  passed: boolean;
}

export interface GenealogyTestSubmission {
  id: string;
  status: string;
  lab_organization_name: string;
  requested_tests: string[];
  results: GenealogyTestResultSummary[];
}

export interface GenealogyResult {
  focusLotId: string;
  root: SeedLotWithAvailability;
  // Root -> ... -> focus lot, inclusive. This is the "backward trace to the
  // original Breeder source" path.
  ancestorPath: SeedLotWithAvailability[];
  // Every node touched by this genealogy: the ancestor path plus the full
  // descendant subtree below the focus lot.
  nodes: SeedLotWithAvailability[];
  allocationsByLot: Record<string, SeedLotAllocation[]>;
  // Chronological audit trail across the ancestor path — the "intermediate
  // transactions" for backward tracing.
  transactions: GenealogyAuditEntry[];
  // Lab test submissions per node — the "Test" step in the Parent Lot ->
  // Harvest -> Test -> Split -> Current Lot tree (see
  // server/src/modules/labTesting; testing_status on each node itself
  // already carries the certified/rejected outcome).
  testSubmissionsByLot: Record<string, GenealogyTestSubmission[]>;
}

interface GenealogyViewRow {
  seed_lot_id: string;
  ancestor_ids: string[];
  descendant_ids: string[];
  generation: number;
}

/**
 * mv_seed_lot_genealogy precomputes every lot's full ancestor/descendant
 * sets (migration 034), refreshed (fire-and-forget) after every seed lot
 * creation — so it trades a small, bounded staleness window (a lot created
 * moments ago, or a brand-new child of an existing lot, might not be
 * reflected until the next refresh lands) for turning what used to be N
 * sequential round-trips (ancestors) or a live recursive CTE (descendants)
 * into one indexed lookup. That trade-off is the whole point of a
 * materialized view, not a bug to engineer around.
 */
async function getGenealogyViewRow(id: string): Promise<GenealogyViewRow | null> {
  const result = await pool.query<GenealogyViewRow>('SELECT * FROM mv_seed_lot_genealogy WHERE seed_lot_id = $1', [id]);
  return result.rows[0] ?? null;
}

async function fetchLotsByIds(ids: string[]): Promise<Map<string, SeedLot>> {
  if (ids.length === 0) return new Map();
  const result = await pool.query<SeedLot>('SELECT * FROM seed_lots WHERE id = ANY($1::uuid[])', [ids]);
  return new Map(result.rows.map((lot) => [lot.id, lot]));
}

async function fetchAncestorChainLive(id: string): Promise<SeedLot[]> {
  const chain: SeedLot[] = [];
  const seen = new Set<string>();
  let currentId: string | null = id;

  while (currentId) {
    if (seen.has(currentId)) break; // defensive; writes already forbid cycles
    seen.add(currentId);
    const result: QueryResult<SeedLot> = await pool.query<SeedLot>('SELECT * FROM seed_lots WHERE id = $1', [currentId]);
    const lot: SeedLot | undefined = result.rows[0];
    if (!lot) break;
    chain.unshift(lot);
    currentId = lot.parent_lot_id;
  }

  return chain;
}

async function fetchDescendantsLive(id: string): Promise<SeedLot[]> {
  const result = await pool.query<SeedLot>(
    `WITH RECURSIVE descendants AS (
       SELECT * FROM seed_lots WHERE id = $1
       UNION ALL
       SELECT sl.* FROM seed_lots sl JOIN descendants d ON sl.parent_lot_id = d.id
     )
     SELECT * FROM descendants WHERE id <> $1`,
    [id],
  );
  return result.rows;
}

export async function fetchAncestorChain(id: string): Promise<SeedLot[]> {
  const viewRow = await getGenealogyViewRow(id);
  if (!viewRow) return fetchAncestorChainLive(id);

  const orderedIds = [...viewRow.ancestor_ids, id];
  const lotsById = await fetchLotsByIds(orderedIds);
  const chain = orderedIds.map((lotId) => lotsById.get(lotId)).filter((lot): lot is SeedLot => Boolean(lot));
  // A row disappearing between the view read and this fetch (deleted lot)
  // is the only way this comes back short — fall back to the live path
  // rather than silently return a truncated chain.
  return chain.length === orderedIds.length ? chain : fetchAncestorChainLive(id);
}

async function fetchDescendants(id: string): Promise<SeedLot[]> {
  const viewRow = await getGenealogyViewRow(id);
  if (!viewRow) return fetchDescendantsLive(id);
  if (viewRow.descendant_ids.length === 0) return [];

  const lotsById = await fetchLotsByIds(viewRow.descendant_ids);
  return Array.from(lotsById.values());
}

/**
 * Fire-and-forget by design — see the doc comment on getGenealogyViewRow.
 * REFRESH MATERIALIZED VIEW CONCURRENTLY cannot run inside a transaction
 * block (a hard Postgres restriction, including from within a PL/pgSQL
 * function), so this must be called outside any withTransaction() — always
 * after the triggering transaction has already committed.
 */
export function refreshGenealogyView(): void {
  refreshGenealogyViewNow().catch((error) => {
    console.error('[genealogy] failed to refresh mv_seed_lot_genealogy:', error);
  });
}

/** Awaitable version for the manual ops/debugging endpoint, which wants real confirmation the refresh finished. */
export async function refreshGenealogyViewNow(): Promise<void> {
  await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_seed_lot_genealogy');
}

export async function getGenealogy(id: string): Promise<GenealogyResult> {
  const ancestorPath = await fetchAncestorChain(id);
  if (ancestorPath.length === 0) {
    throw new NotFoundError(`Seed lot ${id} not found`);
  }

  const descendants = await fetchDescendants(id);

  const nodeMap = new Map<string, SeedLot>();
  [...ancestorPath, ...descendants].forEach((lot) => nodeMap.set(lot.id, lot));
  const nodes = Array.from(nodeMap.values());
  const nodeIds = nodes.map((node) => node.id);

  const allocationsResult = await pool.query<SeedLotAllocation>(
    'SELECT * FROM seed_lot_allocations WHERE seed_lot_id = ANY($1::uuid[]) ORDER BY created_at ASC',
    [nodeIds],
  );
  const allocationsByLot: Record<string, SeedLotAllocation[]> = {};
  for (const allocation of allocationsResult.rows) {
    (allocationsByLot[allocation.seed_lot_id] ??= []).push(allocation);
  }

  const ancestorIds = ancestorPath.map((lot) => lot.id);
  const transactionsResult = await pool.query<GenealogyAuditEntry>(
    `SELECT * FROM audit_logs
     WHERE (entity_type = 'seed_lot' AND entity_id = ANY($1::uuid[]))
        OR (entity_type = 'seed_lot_allocation' AND entity_id IN (
              SELECT id FROM seed_lot_allocations WHERE seed_lot_id = ANY($1::uuid[])
            ))
     ORDER BY created_at ASC`,
    [ancestorIds],
  );

  const testSubmissionsByLot = await fetchTestSubmissionsByLot(nodeIds);

  return {
    focusLotId: id,
    root: withAvailability(ancestorPath[0]),
    ancestorPath: ancestorPath.map(withAvailability),
    nodes: nodes.map(withAvailability),
    allocationsByLot,
    transactions: transactionsResult.rows,
    testSubmissionsByLot,
  };
}

async function fetchTestSubmissionsByLot(nodeIds: string[]): Promise<Record<string, GenealogyTestSubmission[]>> {
  if (nodeIds.length === 0) return {};

  const submissionsResult = await pool.query<{
    id: string;
    seed_lot_id: string;
    status: string;
    requested_tests: string[];
    lab_organization_name: string;
  }>(
    `SELECT s.id, s.seed_lot_id, s.status, s.requested_tests, o.name AS lab_organization_name
     FROM lab_test_submissions s
     JOIN organizations o ON o.id = s.lab_organization_id
     WHERE s.seed_lot_id = ANY($1::uuid[])
     ORDER BY s.submitted_at ASC`,
    [nodeIds],
  );
  if (submissionsResult.rows.length === 0) return {};

  const submissionIds = submissionsResult.rows.map((row) => row.id);
  const resultsResult = await pool.query<{
    submission_id: string;
    test_type: string;
    result_value: string;
    threshold_used: string;
    passed: boolean;
  }>('SELECT submission_id, test_type, result_value, threshold_used, passed FROM lab_test_results WHERE submission_id = ANY($1::uuid[])', [
    submissionIds,
  ]);
  const resultsBySubmission = new Map<string, GenealogyTestResultSummary[]>();
  for (const row of resultsResult.rows) {
    const list = resultsBySubmission.get(row.submission_id) ?? [];
    list.push({
      test_type: row.test_type,
      result_value: Number(row.result_value),
      threshold_used: Number(row.threshold_used),
      passed: row.passed,
    });
    resultsBySubmission.set(row.submission_id, list);
  }

  const byLot: Record<string, GenealogyTestSubmission[]> = {};
  for (const row of submissionsResult.rows) {
    (byLot[row.seed_lot_id] ??= []).push({
      id: row.id,
      status: row.status,
      lab_organization_name: row.lab_organization_name,
      requested_tests: row.requested_tests,
      results: resultsBySubmission.get(row.id) ?? [],
    });
  }
  return byLot;
}
