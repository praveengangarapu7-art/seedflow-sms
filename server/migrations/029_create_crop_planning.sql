-- A farmer can work multiple plots with different soil/irrigation
-- characteristics — farmers.region already covers location, this adds the
-- farm/field-level detail (soil type, plot size) the crop planning wizard's
-- recommendation engine needs.
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  soil_type VARCHAR(30) NOT NULL CHECK (soil_type IN ('loamy', 'clay', 'sandy', 'black', 'red', 'alluvial')),
  area_acres NUMERIC(10, 2) NOT NULL CHECK (area_acres > 0),
  irrigation_type VARCHAR(30) CHECK (irrigation_type IN ('canal', 'borewell', 'rainfed', 'drip', 'sprinkler')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farmer_id, name)
);

CREATE INDEX idx_farms_farmer_id ON farms (farmer_id);

-- The wizard's persisted booking. draft: recommendation + quantity computed,
-- nothing touches inventory yet. reserved: a real seed_lot_allocations row
-- now exists (seed_lot_id/allocation_id set) — the "real-time reservation".
-- confirmed: the final booking. cancelled: releases the allocation if one
-- was made. recommendation_snapshot freezes what the wizard showed/why, for
-- history, since variety data and ratings can change after the fact.
CREATE TABLE crop_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
  crop VARCHAR(100) NOT NULL,
  variety_id UUID NOT NULL REFERENCES varieties(id) ON DELETE RESTRICT,
  target_area_acres NUMERIC(10, 2) NOT NULL CHECK (target_area_acres > 0),
  calculated_seed_quantity NUMERIC(10, 2) NOT NULL,
  seed_unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  sowing_date DATE,
  seed_lot_id UUID REFERENCES seed_lots(id) ON DELETE RESTRICT,
  allocation_id UUID REFERENCES seed_lot_allocations(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reserved', 'confirmed', 'cancelled')),
  recommendation_snapshot JSONB,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crop_plans_farmer_id ON crop_plans (farmer_id);
CREATE INDEX idx_crop_plans_farm_id ON crop_plans (farm_id);
CREATE INDEX idx_crop_plans_status ON crop_plans (status);
