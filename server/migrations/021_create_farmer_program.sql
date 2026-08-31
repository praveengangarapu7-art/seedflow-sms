-- Farmers get a real backend identity for the first time in this system
-- (previously they only existed as frontend mock data) — adoption/
-- effectiveness reporting needs real relational data to aggregate over.
CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  region VARCHAR(100) NOT NULL,
  location VARCHAR(150),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_farmers_region ON farmers (region);
CREATE INDEX idx_farmers_organization_id ON farmers (organization_id);

CREATE TRIGGER trg_farmers_touch_updated_at
BEFORE UPDATE ON farmers
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

-- A farmer's request for a seed lot. `region` is denormalized from the
-- farmer at request time so regional distribution-list history stays
-- accurate even if the farmer's own region is later corrected.
CREATE TABLE seed_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100) NOT NULL,
  quantity_requested NUMERIC(12, 2) NOT NULL CHECK (quantity_requested > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  region VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'approved', 'allocated', 'delivered', 'rejected', 'cancelled'
  )),
  requested_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  allocation_id UUID REFERENCES seed_lot_allocations(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seed_requests_farmer_id ON seed_requests (farmer_id);
CREATE INDEX idx_seed_requests_status ON seed_requests (status);
CREATE INDEX idx_seed_requests_region ON seed_requests (region);
CREATE INDEX idx_seed_requests_crop_variety ON seed_requests (crop, variety);

CREATE TRIGGER trg_seed_requests_touch_updated_at
BEFORE UPDATE ON seed_requests
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

-- Post-harvest feedback a farmer gives on a variety they received.
CREATE TABLE performance_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
  seed_request_id UUID REFERENCES seed_requests(id) ON DELETE SET NULL,
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100) NOT NULL,
  germination_rating INT NOT NULL CHECK (germination_rating BETWEEN 1 AND 5),
  yield_rating INT NOT NULL CHECK (yield_rating BETWEEN 1 AND 5),
  overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  harvested_quantity NUMERIC(12, 2),
  feedback_text TEXT,
  recorded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_performance_ratings_farmer_id ON performance_ratings (farmer_id);
CREATE INDEX idx_performance_ratings_crop_variety ON performance_ratings (crop, variety);
