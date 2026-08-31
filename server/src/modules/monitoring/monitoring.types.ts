export type ErrorSource = 'backend' | 'frontend';
export type ErrorLevel = 'error' | 'warning';

export interface LogErrorInput {
  source: ErrorSource;
  level?: ErrorLevel;
  message: string;
  stackTrace?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  userEmail?: string;
  context?: Record<string, unknown>;
}

export interface ErrorLogGroup {
  fingerprint: string;
  source: ErrorSource;
  level: ErrorLevel;
  message: string;
  stack_trace: string | null;
  route: string | null;
  method: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface RecordApiMetricInput {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  userEmail?: string | null;
}

export interface ApiPerformanceEntry {
  method: string;
  route: string;
  requestCount: number;
  avgDurationMs: number;
  p95DurationMs: number;
  errorRate: number;
}

export interface FailedOperationEntry {
  method: string;
  route: string;
  statusCode: number;
  occurrenceCount: number;
  lastOccurredAt: string;
}

export interface UserActivityEntry {
  userEmail: string;
  actionCount: number;
  distinctEntityTypes: number;
  lastActionAt: string;
}

export interface DataConsistencySummary {
  parentageViolationCount: number;
  reconciliationDiscrepancyCount: number;
  orphanLotCount: number;
}

export type AnomalyMetricKey = 'backend_errors' | 'lab_test_failures' | 'quality_flags_raised';

export interface AnomalyEntry {
  metric: AnomalyMetricKey;
  label: string;
  todayCount: number;
  trailingDailyAverage: number;
  isAnomalous: boolean;
}
