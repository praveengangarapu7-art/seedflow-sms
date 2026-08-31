-- Climate-Smart Seed Selection Engine. There is no live weather/climate API
-- integration and no ML infrastructure anywhere in this app — staff record
-- predicted conditions from whatever external forecast they've received
-- (same tradeoff as market_intelligence's weather_outlooks/ministry
-- forecasts), and "AI-powered scoring" is a transparent, explainable
-- weighted formula (see climateResilienceScoring.ts), not a black box.
-- This is deliberately a NEW numeric climate table, distinct from
-- market_intelligence's categorical weather_outlooks (region+crop+season
-- outlook for demand scoring) — this one carries actual predicted
-- rainfall/temperature values for farm-level variety selection.

CREATE TABLE climate_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region VARCHAR(100) NOT NULL,
  season VARCHAR(30) NOT NULL,
  predicted_rainfall_mm NUMERIC,
  predicted_avg_temp_celsius NUMERIC,
  predicted_min_temp_celsius NUMERIC,
  predicted_max_temp_celsius NUMERIC,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'moderate', 'high', 'severe')),
  primary_risk_factor VARCHAR(30) CHECK (primary_risk_factor IN ('drought', 'excess_rainfall', 'heat', 'cold', 'none')),
  source VARCHAR(150) NOT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_climate_predictions_region_season ON climate_predictions (region, season, created_at DESC);

-- One row per (farm, affected crop) — created automatically when a
-- high/severe-risk prediction is recorded for a region with farms actively
-- planning a crop there. Real-time delivery reuses the existing WebSocket
-- broadcast() mechanism already used for LOW_STOCK_ALERT (allocations
-- module) rather than a new farmer-targeted push/SMS channel, since no
-- farmer-linked device or SMS gateway exists anywhere in this app; this
-- table is the durable, queryable record of what was alerted and to whom.
CREATE TABLE climate_risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  climate_prediction_id UUID NOT NULL REFERENCES climate_predictions(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  crop VARCHAR(100) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_climate_risk_alerts_farm ON climate_risk_alerts (farm_id, created_at DESC);
CREATE INDEX idx_climate_risk_alerts_farmer ON climate_risk_alerts (farmer_id, created_at DESC);

-- Closing the loop: how a variety actually performed under the climate
-- conditions predicted for it, feeding back into future resilience scores
-- as real track-record data accumulates (the same "record actual, blend
-- into future predictions" pattern breeding_analytics' hybrid_cross_predictions uses).
CREATE TABLE adaptation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  variety_id UUID NOT NULL REFERENCES varieties(id) ON DELETE RESTRICT,
  climate_prediction_id UUID REFERENCES climate_predictions(id) ON DELETE SET NULL,
  crop VARCHAR(100) NOT NULL,
  season VARCHAR(30) NOT NULL,
  actual_yield_per_acre NUMERIC,
  outcome_rating VARCHAR(20) NOT NULL CHECK (outcome_rating IN ('excellent', 'good', 'fair', 'poor')),
  notes TEXT,
  recorded_by VARCHAR(100) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_adaptation_outcomes_variety_climate ON adaptation_outcomes (variety_id, climate_prediction_id);
