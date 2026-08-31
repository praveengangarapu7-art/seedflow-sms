-- farmers is the only genuinely personally-identifiable entity in this
-- schema (name, phone, location). Four of its five dependent tables
-- (seed_requests, performance_ratings, farms, crop_plans) reference it with
-- ON DELETE RESTRICT + NOT NULL — a hard DELETE is not viable for any
-- farmer with real transaction history, so "right to forget" here means
-- anonymize-in-place: scrub the PII columns, keep the row (and every
-- foreign-keyed business/audit record) intact. These columns track that.
ALTER TABLE farmers
  ADD COLUMN anonymized BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN anonymized_at TIMESTAMPTZ,
  ADD COLUMN anonymized_by VARCHAR(100),
  ADD COLUMN anonymization_reason TEXT;

-- Every read of farmer PII gets one row here — there was no read/access
-- logging anywhere in this codebase before this (confirmed by audit);
-- audit_logs only ever covers writes.
CREATE TABLE data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('view', 'list', 'export')),
  accessed_by VARCHAR(150) NOT NULL,
  accessed_by_role VARCHAR(30) NOT NULL,
  was_masked BOOLEAN NOT NULL,
  route VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_access_logs_entity ON data_access_logs (entity_type, entity_id);
CREATE INDEX idx_data_access_logs_accessed_by ON data_access_logs (accessed_by);
CREATE INDEX idx_data_access_logs_created_at ON data_access_logs (created_at DESC);

-- One active policy per entity type. archiveOldPartitions.ts (from the
-- prior database-optimization pass) reads the audit_log/api_request_metric
-- rows to decide how many years to retain, rather than a hardcoded
-- constant — this table is the single source of truth for both retention
-- actions this task adds (anonymize) and the archival action already built.
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL UNIQUE,
  retention_days INT NOT NULL CHECK (retention_days > 0),
  action VARCHAR(20) NOT NULL CHECK (action IN ('anonymize', 'archive')),
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO data_retention_policies (entity_type, retention_days, action, description) VALUES
  ('farmer', 730, 'anonymize', 'Farmer contact details (name, phone, location) are anonymized after 2 years with no associated activity (no new seed requests, ratings, crop plans, or farms).'),
  ('audit_log', 730, 'archive', 'Audit log entries older than this are archived (partitioned out of the hot table) rather than deleted — see scripts/archiveOldPartitions.ts.'),
  ('api_request_metric', 365, 'archive', 'API request/performance metrics are archived after 1 year — lower-sensitivity, shorter-lived operational telemetry.');
