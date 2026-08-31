-- Market Intelligence & Demand Forecasting. This app has no live external
-- market-data feed, weather API, ministry data pipe, or ML infrastructure —
-- so, the same honest tradeoff as phytosanitary_certificates/lab test
-- results (which model "external authority" input via staff-mediated
-- recording, not a live network poll), each external data category is
-- recorded by authorized staff as a dated observation. The "ML model" is a
-- transparent, explainable weighted-signal score (see demandScoring.ts) —
-- every contributing signal and its weight is stored alongside the score,
-- not hidden inside a black box.

CREATE TABLE market_price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  region VARCHAR(100),
  price_per_unit NUMERIC NOT NULL CHECK (price_per_unit > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  observed_date DATE NOT NULL,
  source VARCHAR(150) NOT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_market_price_obs_crop_variety ON market_price_observations (crop, variety, observed_date DESC);

CREATE TABLE ministry_demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  region VARCHAR(100),
  season VARCHAR(30) NOT NULL,
  forecasted_demand_quantity NUMERIC NOT NULL CHECK (forecasted_demand_quantity >= 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  issuing_authority VARCHAR(150) NOT NULL,
  published_date DATE NOT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ministry_forecasts_crop_variety ON ministry_demand_forecasts (crop, variety, published_date DESC);

CREATE TABLE weather_outlooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region VARCHAR(100) NOT NULL,
  crop VARCHAR(100),
  season VARCHAR(30) NOT NULL,
  outlook VARCHAR(20) NOT NULL CHECK (outlook IN ('favorable', 'normal', 'adverse', 'severe')),
  rainfall_deviation_percent NUMERIC,
  issuing_authority VARCHAR(150) NOT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_weather_outlooks_crop_season ON weather_outlooks (crop, season, created_at DESC);

CREATE TABLE crop_insurance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  region VARCHAR(100),
  season VARCHAR(30) NOT NULL,
  claims_count INT NOT NULL DEFAULT 0 CHECK (claims_count >= 0),
  total_claim_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_claim_amount >= 0),
  total_insured_quantity NUMERIC CHECK (total_insured_quantity IS NULL OR total_insured_quantity > 0),
  recorded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crop_insurance_crop_variety_season ON crop_insurance_records (crop, variety, season);

-- The scoring engine's output — a versioned snapshot (same convention as
-- quality_certificates/government_reports) so a past forecast and the
-- exact signals that produced it stay reproducible even as new market data
-- is recorded afterward.
CREATE TABLE variety_demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100) NOT NULL,
  season VARCHAR(30) NOT NULL,
  demand_score NUMERIC(5, 1) NOT NULL CHECK (demand_score BETWEEN 0 AND 100),
  recommended_action VARCHAR(20) NOT NULL CHECK (recommended_action IN ('increase_production', 'maintain', 'decrease_production')),
  suggested_price_per_unit NUMERIC,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  signals_breakdown JSONB NOT NULL,
  generated_by VARCHAR(100) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_variety_demand_forecasts_lookup ON variety_demand_forecasts (crop, variety, season, generated_at DESC);
CREATE INDEX idx_variety_demand_forecasts_season_score ON variety_demand_forecasts (season, demand_score DESC);
