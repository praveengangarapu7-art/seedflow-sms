-- Real bugs, not business-rule rejections: only genuinely unexpected
-- exceptions (backend 500s) and frontend render crashes land here — a
-- 400/404/409 from normal validation is expected behavior and belongs in
-- api_request_metrics instead, not treated as a defect to triage.
--
-- Append-only by design (one row per occurrence, not per fingerprint) so the
-- daily time series stays intact for anomaly detection — "aggregation" is
-- computed by grouping on fingerprint at query time, not by upserting a
-- running counter at write time, which would have collapsed exactly the
-- day-by-day signal anomaly checks need.
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL CHECK (source IN ('backend', 'frontend')),
  level VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'warning')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  route VARCHAR(200),
  method VARCHAR(10),
  status_code INT,
  user_email VARCHAR(150),
  context JSONB,
  fingerprint VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_fingerprint ON error_logs (fingerprint);
CREATE INDEX idx_error_logs_created_at ON error_logs (created_at);
CREATE INDEX idx_error_logs_source ON error_logs (source);

-- One row per HTTP request/response — the raw material for both API
-- performance monitoring (duration percentiles) and "failed operations"
-- (status_code >= 400), and the time series the anomaly checks read from.
CREATE TABLE api_request_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method VARCHAR(10) NOT NULL,
  route VARCHAR(200) NOT NULL,
  status_code INT NOT NULL,
  duration_ms INT NOT NULL,
  user_email VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_request_metrics_created_at ON api_request_metrics (created_at);
CREATE INDEX idx_api_request_metrics_route ON api_request_metrics (route);
CREATE INDEX idx_api_request_metrics_status ON api_request_metrics (status_code);
