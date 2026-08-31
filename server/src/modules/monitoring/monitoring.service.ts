import { createHash } from 'crypto';
import { pool } from '../../db/pool';
import { getReconciliationReport, listOrphanLots, scanForViolations } from '../dataGovernance/dataGovernance.service';
import { sendPushToAllDevices } from '../pushNotifications/pushNotifications.service';
import type {
  AnomalyEntry,
  ApiPerformanceEntry,
  DataConsistencySummary,
  ErrorLogGroup,
  FailedOperationEntry,
  LogErrorInput,
  RecordApiMetricInput,
  UserActivityEntry,
} from './monitoring.types';

function computeFingerprint(source: string, route: string | undefined, message: string): string {
  // Normalize away anything ID-like (uuids, numbers) so the same underlying
  // bug reported against different records groups into one fingerprint.
  const normalizedMessage = message.replace(/[0-9a-f-]{8,}/gi, '<id>').replace(/\d+/g, '<n>');
  return createHash('sha256').update(`${source}:${route ?? 'unknown'}:${normalizedMessage}`).digest('hex').slice(0, 64);
}

/**
 * Best-effort logging — a failure here must never mask or replace the
 * original error being reported, so every call site wraps this in its own
 * try/catch (or awaits without letting a rejection propagate).
 */
export async function logError(input: LogErrorInput): Promise<void> {
  const fingerprint = computeFingerprint(input.source, input.route, input.message);

  await pool.query(
    `INSERT INTO error_logs (source, level, message, stack_trace, route, method, status_code, user_email, context, fingerprint)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
    [
      input.source,
      input.level ?? 'error',
      input.message,
      input.stackTrace ?? null,
      input.route ?? null,
      input.method ?? null,
      input.statusCode ?? null,
      input.userEmail ?? null,
      input.context ? JSON.stringify(input.context) : null,
      fingerprint,
    ],
  );

  void checkAndAlertAnomalies();
}

/**
 * Unlike getApiPerformance/getFailedOperations (both already time-windowed),
 * this used to group the ENTIRE error_logs table on every call with no
 * bound at all — the exact "unbounded result set on a growing table" this
 * task is about. Defaults to 30 days, same windowHours convention as the
 * rest of this module, so a long-lived deployment's dashboard doesn't get
 * slower the longer it's been running.
 */
export async function listErrorLogs(filters: { source?: string; windowHours?: number }): Promise<ErrorLogGroup[]> {
  const windowHours = filters.windowHours ?? 24 * 30;
  const conditions: string[] = [`created_at >= now() - ($1 || ' hours')::interval`];
  const values: unknown[] = [windowHours];
  if (filters.source) {
    values.push(filters.source);
    conditions.push(`source = $${values.length}`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await pool.query(
    `SELECT fingerprint,
            MAX(source) AS source,
            MAX(level) AS level,
            MAX(message) AS message,
            MAX(stack_trace) AS stack_trace,
            MAX(route) AS route,
            MAX(method) AS method,
            COUNT(*)::int AS occurrence_count,
            MIN(created_at) AS first_seen_at,
            MAX(created_at) AS last_seen_at
     FROM error_logs
     ${whereClause}
     GROUP BY fingerprint
     ORDER BY last_seen_at DESC`,
    values,
  );
  return result.rows;
}

export async function recordApiMetric(input: RecordApiMetricInput): Promise<void> {
  await pool.query(
    `INSERT INTO api_request_metrics (method, route, status_code, duration_ms, user_email)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.method, input.route, input.statusCode, input.durationMs, input.userEmail ?? null],
  );
}

export async function getApiPerformance(windowHours = 24): Promise<ApiPerformanceEntry[]> {
  const result = await pool.query(
    `SELECT method, route,
            COUNT(*)::int AS request_count,
            AVG(duration_ms) AS avg_duration_ms,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms,
            (COUNT(*) FILTER (WHERE status_code >= 400))::numeric / COUNT(*) * 100 AS error_rate
     FROM api_request_metrics
     WHERE created_at >= now() - ($1 || ' hours')::interval
     GROUP BY method, route
     ORDER BY request_count DESC`,
    [windowHours],
  );
  return result.rows.map((row) => ({
    method: row.method,
    route: row.route,
    requestCount: Number(row.request_count),
    avgDurationMs: Math.round(Number(row.avg_duration_ms)),
    p95DurationMs: Math.round(Number(row.p95_duration_ms)),
    errorRate: Math.round(Number(row.error_rate) * 10) / 10,
  }));
}

export async function getFailedOperations(windowHours = 24): Promise<FailedOperationEntry[]> {
  const result = await pool.query(
    `SELECT method, route, status_code,
            COUNT(*)::int AS occurrence_count,
            MAX(created_at) AS last_occurred_at
     FROM api_request_metrics
     WHERE status_code >= 400 AND created_at >= now() - ($1 || ' hours')::interval
     GROUP BY method, route, status_code
     ORDER BY occurrence_count DESC`,
    [windowHours],
  );
  return result.rows.map((row) => ({
    method: row.method,
    route: row.route,
    statusCode: row.status_code,
    occurrenceCount: Number(row.occurrence_count),
    lastOccurredAt: row.last_occurred_at,
  }));
}

export async function getUserActivitySummary(windowHours = 24): Promise<UserActivityEntry[]> {
  const result = await pool.query(
    `SELECT performed_by,
            COUNT(*)::int AS action_count,
            COUNT(DISTINCT entity_type)::int AS distinct_entity_types,
            MAX(created_at) AS last_action_at
     FROM audit_logs
     WHERE created_at >= now() - ($1 || ' hours')::interval
     GROUP BY performed_by
     ORDER BY action_count DESC`,
    [windowHours],
  );
  return result.rows.map((row) => ({
    userEmail: row.performed_by,
    actionCount: Number(row.action_count),
    distinctEntityTypes: Number(row.distinct_entity_types),
    lastActionAt: row.last_action_at,
  }));
}

/**
 * Reuses the existing data-governance scans rather than re-implementing
 * consistency checks — those already ARE this system's "data inconsistency"
 * detectors; this just surfaces their counts on the monitoring dashboard.
 */
export async function getDataConsistencySummary(): Promise<DataConsistencySummary> {
  const [violations, reconciliation, orphans] = await Promise.all([
    scanForViolations(),
    getReconciliationReport(),
    listOrphanLots(),
  ]);

  return {
    parentageViolationCount: violations.length,
    reconciliationDiscrepancyCount: reconciliation.filter((r) => r.discrepancy !== 0).length,
    orphanLotCount: orphans.length,
  };
}

async function dailyCountToday(table: string, timeColumn: string, extraWhere?: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM ${table} WHERE ${timeColumn} >= date_trunc('day', now()) ${extraWhere ? `AND ${extraWhere}` : ''}`,
  );
  return Number(result.rows[0].count);
}

async function trailingDailyAverage(table: string, timeColumn: string, extraWhere?: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM ${table}
     WHERE ${timeColumn} >= date_trunc('day', now()) - INTERVAL '7 days'
       AND ${timeColumn} < date_trunc('day', now())
       ${extraWhere ? `AND ${extraWhere}` : ''}`,
  );
  return Number(result.rows[0].count) / 7;
}

/**
 * A metric is anomalous when today's count both clears an absolute floor
 * (so a jump from 0 to 1 on a normally-quiet metric doesn't trip the alarm)
 * AND is at least double the trailing 7-day daily average — a simple,
 * explainable rule rather than a statistical model, matching how this
 * codebase prefers well-defined heuristics over black-box thresholds.
 */
function isAnomalous(todayCount: number, trailingAverage: number): boolean {
  return todayCount >= 5 && todayCount > trailingAverage * 2;
}

export async function getBusinessMetricAnomalies(): Promise<AnomalyEntry[]> {
  const [errorsToday, errorsAvg, labFailToday, labFailAvg, flagsToday, flagsAvg] = await Promise.all([
    dailyCountToday('error_logs', 'created_at', "source = 'backend'"),
    trailingDailyAverage('error_logs', 'created_at', "source = 'backend'"),
    dailyCountToday('lab_test_results', 'recorded_at', 'passed = false'),
    trailingDailyAverage('lab_test_results', 'recorded_at', 'passed = false'),
    dailyCountToday('lab_quality_flags', 'flagged_at'),
    trailingDailyAverage('lab_quality_flags', 'flagged_at'),
  ]);

  const entries: AnomalyEntry[] = [
    {
      metric: 'backend_errors',
      label: 'Backend errors today',
      todayCount: errorsToday,
      trailingDailyAverage: Math.round(errorsAvg * 10) / 10,
      isAnomalous: isAnomalous(errorsToday, errorsAvg),
    },
    {
      metric: 'lab_test_failures',
      label: 'Failed lab test results today',
      todayCount: labFailToday,
      trailingDailyAverage: Math.round(labFailAvg * 10) / 10,
      isAnomalous: isAnomalous(labFailToday, labFailAvg),
    },
    {
      metric: 'quality_flags_raised',
      label: 'Quality flags raised today',
      todayCount: flagsToday,
      trailingDailyAverage: Math.round(flagsAvg * 10) / 10,
      isAnomalous: isAnomalous(flagsToday, flagsAvg),
    },
  ];

  return entries;
}

// Reset daily so the same anomaly can alert again on a subsequent bad day,
// but doesn't spam a push notification on every single error insert.
let lastAlertedDay: string | null = null;
const alertedMetricsToday = new Set<string>();

async function checkAndAlertAnomalies(): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (lastAlertedDay !== today) {
      lastAlertedDay = today;
      alertedMetricsToday.clear();
    }

    const anomalies = await getBusinessMetricAnomalies();
    const newAnomalies = anomalies.filter((a) => a.isAnomalous && !alertedMetricsToday.has(a.metric));
    if (newAnomalies.length === 0) return;

    for (const anomaly of newAnomalies) {
      alertedMetricsToday.add(anomaly.metric);
    }

    const summary = newAnomalies.map((a) => `${a.label}: ${a.todayCount} (avg ${a.trailingDailyAverage})`).join('; ');
    await sendPushToAllDevices('Business Metric Anomaly Detected', summary, {
      type: 'ANOMALY_ALERT',
      metrics: newAnomalies.map((a) => a.metric),
    });
  } catch (error) {
    console.error('[monitoring] anomaly check failed:', error);
  }
}
