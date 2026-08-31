-- Crops (master data catalog) — a lightweight reference entity distinct from
-- crop_plans (a production planning cycle) and the free-text `crop` column
-- already denormalized onto seed_lots/varieties/farmer-facing tables. This
-- table is the source of truth the frontend's Crop master-data screen reads
-- and writes; category/season are constrained to the same fixed option
-- lists the frontend dropdown already offers, so the two stay in sync.
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL UNIQUE,
  category VARCHAR(30) NOT NULL
    CHECK (category IN ('Food Grain', 'Cash Crop', 'Oilseed', 'Vegetable', 'Pulse', 'Fibre Crop')),
  season VARCHAR(20) NOT NULL
    CHECK (season IN ('Kharif', 'Rabi', 'Summer', 'Year-round', 'Winter')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crops_category ON crops (category);
CREATE INDEX idx_crops_active ON crops (active);

CREATE TRIGGER trg_crops_touch_updated_at
BEFORE UPDATE ON crops
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
