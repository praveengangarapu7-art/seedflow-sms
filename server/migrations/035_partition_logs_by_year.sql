-- Converts audit_logs and api_request_metrics to native Postgres range
-- partitioning by year (on created_at). Both are pure append-only logs
-- with nothing referencing their id via foreign key (confirmed by an audit
-- of every REFERENCES clause in this migrations directory) — that's what
-- makes them safe to partition. seed_lots itself is deliberately NOT
-- partitioned here: 15+ tables hold a foreign key straight to seed_lots(id),
-- and partitioning it would force the partition key into every one of
-- those FKs too (Postgres requires a partitioned table's partition key to
-- be part of any unique/PK constraint another table's FK relies on) — a
-- much larger, higher-risk migration than this task's scope justifies. The
-- btree index on seed_lots.production_date added in migration 033 gets
-- most of the same range-query benefit without that blast radius.
--
-- Partitions cover 2024-2027 plus a DEFAULT catch-all so no insert can ever
-- fail for falling outside the explicit ranges; a real deployment running
-- past 2027 needs a periodic job to add the next year's partition ahead of
-- time (see scripts/ensureFuturePartitions.ts).

ALTER TABLE audit_logs RENAME TO audit_logs_unpartitioned;
DROP INDEX idx_audit_logs_entity;
DROP INDEX idx_audit_logs_created_at;

CREATE TABLE audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  performed_by VARCHAR(100) NOT NULL,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2024 PARTITION OF audit_logs FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE audit_logs_2025 PARTITION OF audit_logs FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_logs_2027 PARTITION OF audit_logs FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- Creating these on the partitioned parent auto-creates matching indexes on
-- every existing partition, and on any future one attached later.
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, before_state, after_state, metadata, created_at)
SELECT id, entity_type, entity_id, action, performed_by, before_state, after_state, metadata, created_at
FROM audit_logs_unpartitioned;

DROP TABLE audit_logs_unpartitioned;

-- Same treatment for api_request_metrics — the fastest-growing table in
-- the schema, since it gets a row per HTTP request rather than per mutation.
ALTER TABLE api_request_metrics RENAME TO api_request_metrics_unpartitioned;
DROP INDEX idx_api_request_metrics_created_at;
DROP INDEX idx_api_request_metrics_route;
DROP INDEX idx_api_request_metrics_status;

CREATE TABLE api_request_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  method VARCHAR(10) NOT NULL,
  route VARCHAR(200) NOT NULL,
  status_code INT NOT NULL,
  duration_ms INT NOT NULL,
  user_email VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE api_request_metrics_2024 PARTITION OF api_request_metrics FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE api_request_metrics_2025 PARTITION OF api_request_metrics FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE api_request_metrics_2026 PARTITION OF api_request_metrics FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE api_request_metrics_2027 PARTITION OF api_request_metrics FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE api_request_metrics_default PARTITION OF api_request_metrics DEFAULT;

CREATE INDEX idx_api_request_metrics_created_at ON api_request_metrics (created_at);
CREATE INDEX idx_api_request_metrics_route ON api_request_metrics (route);
CREATE INDEX idx_api_request_metrics_status ON api_request_metrics (status_code);

INSERT INTO api_request_metrics (id, method, route, status_code, duration_ms, user_email, created_at)
SELECT id, method, route, status_code, duration_ms, user_email, created_at
FROM api_request_metrics_unpartitioned;

DROP TABLE api_request_metrics_unpartitioned;
