-- Storage tracking operates on packaging_batches (the physical, shelf-life-
-- bearing unit already created by the packaging module) rather than bulk
-- seed_lots — a warehouse assigns rack/cold-storage space to bags, not to
-- an abstract lot record.
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  code VARCHAR(40) NOT NULL UNIQUE,
  warehouse_zone VARCHAR(100) NOT NULL,
  capacity_units INT NOT NULL CHECK (capacity_units > 0),
  target_temperature_c NUMERIC(5, 2) NOT NULL,
  target_humidity_percent NUMERIC(5, 2) NOT NULL,
  daily_rate_per_unit NUMERIC(10, 4) NOT NULL DEFAULT 0 CHECK (daily_rate_per_unit >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_locations_organization_id ON storage_locations (organization_id);

CREATE TRIGGER trg_storage_locations_touch_updated_at
BEFORE UPDATE ON storage_locations
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

-- Append-only stay history: one row per stint a batch spends at a location.
-- The current location for a batch is whichever row has status = 'active'
-- (there's at most one at a time, enforced in the service layer via a
-- locking transaction, not a DB constraint). Moving a batch closes the old
-- row (status='moved') and opens a new one — that history *is* the
-- between-warehouse movement log, no separate table needed.
CREATE TABLE storage_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packaging_batch_id UUID NOT NULL REFERENCES packaging_batches(id) ON DELETE RESTRICT,
  storage_location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'moved', 'removed')),
  stored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  performed_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_assignments_batch_id ON storage_assignments (packaging_batch_id);
CREATE INDEX idx_storage_assignments_location_id ON storage_assignments (storage_location_id);
CREATE INDEX idx_storage_assignments_status ON storage_assignments (status);

-- Periodic (or QA-triggered) readings at a location, checked against that
-- location's target temperature/humidity for deviation alerts.
CREATE TABLE storage_condition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE RESTRICT,
  recorded_temperature_c NUMERIC(5, 2) NOT NULL,
  recorded_humidity_percent NUMERIC(5, 2) NOT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_condition_logs_location_id ON storage_condition_logs (storage_location_id);
