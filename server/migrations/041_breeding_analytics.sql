-- Breeding Program Analytics & Genetics Tracking. Most of "genetic lineage"
-- is already solved by the existing parent_lot_id chain and
-- mv_seed_lot_genealogy materialized view (migration 034) — this feature
-- adds only what's genuinely missing on top of that: measured trait values
-- PER LOT (traits so far only exist at the variety level, which can't
-- support comparing a specific parent lot's measured trait against its
-- specific child lot's), and a place to record a hybrid-vigor PREDICTION
-- for a hypothetical cross that may or may not ever actually be made.
-- Germplasm ranking, trait-inheritance correlation, breeding-cycle
-- timelines, and yield-based ROI are all computed live from this table
-- plus the existing genealogy view — deliberately not stored snapshots,
-- since they're reports over data that keeps changing, the same reasoning
-- market intelligence's breeding-priority recommendations use.

-- Exactly one of numeric_value/category_value is set — a trait like "yield
-- per acre" is numeric, while "disease resistance" is categorical
-- (high/moderate/low/susceptible, matching varieties.disease_resistance_profile's
-- vocabulary) — neither should be forced into the other's shape.
CREATE TABLE lot_trait_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  trait_type VARCHAR(50) NOT NULL,
  numeric_value NUMERIC,
  category_value VARCHAR(30),
  unit VARCHAR(20),
  measured_date DATE NOT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((numeric_value IS NOT NULL) <> (category_value IS NOT NULL))
);
CREATE INDEX idx_lot_trait_measurements_lot_trait ON lot_trait_measurements (seed_lot_id, trait_type);

-- A prediction made BEFORE anyone commits to actually performing a cross —
-- worth persisting (unlike the live reports above) since validating a past
-- prediction against what the cross actually produced requires the
-- original prediction to still exist to compare against.
CREATE TABLE hybrid_cross_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_a_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  parent_b_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  trait_type VARCHAR(50) NOT NULL,
  mid_parent_value NUMERIC NOT NULL,
  same_lineage BOOLEAN NOT NULL,
  predicted_heterosis_percent NUMERIC NOT NULL,
  predicted_vigor_score NUMERIC NOT NULL,
  signals_breakdown JSONB NOT NULL,
  predicted_by VARCHAR(100) NOT NULL,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actual_child_lot_id UUID REFERENCES seed_lots(id) ON DELETE SET NULL,
  actual_trait_value NUMERIC,
  CHECK (parent_a_lot_id <> parent_b_lot_id)
);
CREATE INDEX idx_hybrid_cross_predictions_parents ON hybrid_cross_predictions (parent_a_lot_id, parent_b_lot_id, trait_type);
