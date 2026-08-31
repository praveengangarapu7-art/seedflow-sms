import { pool } from '../../db/pool';
import { env } from '../../config/env';
import type { AssistantContextBlock } from './assistant.types';

/**
 * Read-only data gatherers, one per topic the assistant can ground an answer
 * in. Each returns a compact AssistantContextBlock rather than raw rows, so
 * the prompt builder never has to know table shapes and the row count fed to
 * a model is bounded by AI_MAX_CONTEXT_ROWS.
 *
 * Every function here is a SELECT. See assistant.types.ts for why that is a
 * hard rule rather than a coincidence.
 */

const LIMIT = () => Math.max(1, Math.min(env.aiMaxContextRows, 200));

export async function lowStockLots(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT lot_code, crop, variety, stage,
            (quantity_total - quantity_allocated) AS quantity_available,
            unit, low_stock_threshold, COALESCE(storage_zone, '—') AS storage_zone
       FROM seed_lots
      WHERE status = 'active'
        AND (quantity_total - quantity_allocated) <= low_stock_threshold
      ORDER BY (quantity_total - quantity_allocated) ASC
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Seed lots at or below their low-stock threshold',
    rows: result.rows,
    module: 'Production',
    path: '/batch-operations',
  };
}

export async function expiringOrExpiredLots(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT sl.lot_code, sl.crop, sl.variety, sl.status,
            COALESCE(sl.storage_zone, '—') AS storage_zone,
            sl.production_date
       FROM seed_lots sl
      WHERE sl.status = 'expired'
      ORDER BY sl.production_date ASC
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Seed lots marked expired',
    rows: result.rows,
    module: 'Production',
    path: '/batch-operations',
  };
}

export async function failingLabResults(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT sl.lot_code, r.test_type, r.result_value, r.threshold_used,
            o.name AS laboratory, r.recorded_at::date AS recorded_on
       FROM lab_test_results r
       JOIN lab_test_submissions s ON s.id = r.submission_id
       JOIN seed_lots sl ON sl.id = s.seed_lot_id
       LEFT JOIN organizations o ON o.id = s.lab_organization_id
      WHERE r.passed = false
      ORDER BY r.recorded_at DESC
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Lab test results that failed their certification threshold',
    rows: result.rows,
    module: 'Laboratory',
    path: '/lab/results',
  };
}

export async function openQualityFlags(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT sl.lot_code, f.test_type, f.reason, f.flagged_at::date AS flagged_on
       FROM lab_quality_flags f
       JOIN seed_lots sl ON sl.id = f.seed_lot_id
      WHERE f.resolved = false
      ORDER BY f.flagged_at DESC
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Unresolved laboratory quality flags',
    rows: result.rows,
    module: 'Laboratory',
    path: '/lab/quality-flags',
  };
}

export async function pendingLabSubmissions(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT sl.lot_code, o.name AS laboratory, s.status,
            s.expected_completion_date,
            (s.expected_completion_date < CURRENT_DATE) AS overdue,
            (SELECT COUNT(*) FROM lab_test_results r WHERE r.submission_id = s.id) AS results_in,
            jsonb_array_length(s.requested_tests) AS tests_requested
       FROM lab_test_submissions s
       JOIN seed_lots sl ON sl.id = s.seed_lot_id
       LEFT JOIN organizations o ON o.id = s.lab_organization_id
      WHERE s.status IN ('submitted', 'in_progress')
      ORDER BY s.expected_completion_date ASC
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Lab submissions still in progress',
    rows: result.rows,
    module: 'Laboratory',
    path: '/lab/submissions',
  };
}

export async function pendingSeedRequests(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT f.name AS farmer, r.crop, r.variety,
            r.quantity_requested, r.unit, r.region, r.status,
            r.created_at::date AS requested_on
       FROM seed_requests r
       LEFT JOIN farmers f ON f.id = r.farmer_id
      WHERE r.status IN ('requested', 'approved')
      ORDER BY r.created_at ASC
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Farmer seed requests awaiting action',
    rows: result.rows,
    module: 'Production',
    path: '/seed-farmer-program',
  };
}

export async function inventorySummary(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT crop,
            COUNT(*)::int AS lot_count,
            SUM(quantity_total - quantity_allocated) AS available,
            SUM(quantity_allocated) AS allocated,
            COUNT(*) FILTER (WHERE testing_status = 'certified')::int AS certified_lots
       FROM seed_lots
      WHERE status = 'active'
      GROUP BY crop
      ORDER BY available DESC
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Active inventory by crop',
    rows: result.rows,
    module: 'Production',
    path: '/seed-lot-inventory',
  };
}

export async function storageOverview(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT l.code, l.warehouse_zone, l.capacity_units,
            COUNT(a.id) FILTER (WHERE a.status = 'active')::int AS batches_stored,
            l.target_temperature_c, l.target_humidity_percent
       FROM storage_locations l
       LEFT JOIN storage_assignments a ON a.storage_location_id = l.id
      WHERE l.status = 'active'
      GROUP BY l.id, l.code, l.warehouse_zone, l.capacity_units, l.target_temperature_c, l.target_humidity_percent
      ORDER BY l.warehouse_zone
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Storage locations and current occupancy',
    rows: result.rows,
    module: 'Production',
    path: '/seed-cold-storage',
  };
}

export async function purchaseOrderPipeline(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT po.status, COUNT(*)::int AS order_count
       FROM purchase_orders po
      GROUP BY po.status
      ORDER BY order_count DESC
      LIMIT $1`,
    [LIMIT()],
  );
  return {
    title: 'Purchase orders by status',
    rows: result.rows,
    module: 'Production',
    path: '/demand-forecast',
  };
}

/**
 * A small always-on snapshot so even an open-ended question ("how are we
 * doing?") has real numbers behind it rather than a generic answer.
 */
export async function headlineSnapshot(): Promise<AssistantContextBlock> {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM seed_lots WHERE status = 'active')::int AS active_lots,
       (SELECT COUNT(*) FROM seed_lots WHERE status = 'active'
          AND (quantity_total - quantity_allocated) <= low_stock_threshold)::int AS low_stock_lots,
       (SELECT COUNT(*) FROM seed_lots WHERE testing_status = 'certified')::int AS certified_lots,
       (SELECT COUNT(*) FROM lab_test_submissions WHERE status IN ('submitted','in_progress'))::int AS lab_in_progress,
       (SELECT COUNT(*) FROM lab_quality_flags WHERE resolved = false)::int AS open_quality_flags,
       (SELECT COUNT(*) FROM seed_requests WHERE status = 'requested')::int AS pending_seed_requests`,
  );
  return {
    title: 'Current SeedSphere snapshot',
    rows: result.rows,
    module: 'Platform',
    path: '/modules',
  };
}
