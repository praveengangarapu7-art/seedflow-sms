-- Links a field observation directly to the Certified seed lot that was
-- planted — distinct from the farm-visit-only field inspections in the
-- frontend's mock data, which have no seed lot traceability at all. Optional
-- farmer_id/seed_request_id connect it to the farmer program when the
-- inspected planting came through a tracked request.
CREATE TABLE lot_field_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  seed_request_id UUID REFERENCES seed_requests(id) ON DELETE SET NULL,
  health_score INT NOT NULL CHECK (health_score BETWEEN 0 AND 100),
  disease_detected BOOLEAN NOT NULL DEFAULT false,
  disease_name VARCHAR(150),
  environmental_notes TEXT,
  inspection_date DATE NOT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_disease_name_requires_detection CHECK (NOT disease_detected OR disease_name IS NOT NULL)
);

CREATE INDEX idx_lot_field_inspections_seed_lot_id ON lot_field_inspections (seed_lot_id);
CREATE INDEX idx_lot_field_inspections_farmer_id ON lot_field_inspections (farmer_id);
