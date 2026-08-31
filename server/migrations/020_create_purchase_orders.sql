-- Persisted procurement artifact from demand planning. Crop plans that
-- drive the forecast still live only in the frontend's mock data (as
-- elsewhere in this backend), so the forecast/gap calculation is stateless;
-- a purchase order is the one thing from that process worth a real
-- lifecycle and audit trail, so it gets a table.
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(30) NOT NULL UNIQUE,
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  quantity_requested NUMERIC(12, 2) NOT NULL CHECK (quantity_requested > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged', 'fulfilled', 'cancelled')),
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('auto_generated', 'manual')),
  requested_by VARCHAR(100) NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  fulfilled_seed_lot_id UUID REFERENCES seed_lots(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_orders_organization_id ON purchase_orders (organization_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders (status);
CREATE INDEX idx_purchase_orders_crop_variety ON purchase_orders (crop, variety);

CREATE TRIGGER trg_purchase_orders_touch_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
