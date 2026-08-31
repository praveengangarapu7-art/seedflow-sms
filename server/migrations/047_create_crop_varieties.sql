-- Master Data "crop varieties" catalog: a lightweight, admin-gated approval
-- workflow distinct from the breeding-committee variety catalog in
-- 027_create_varieties.sql (crop/variety_name/botanical_name + seasonal
-- versions + peer committee review). This table is the source of truth for
-- the Master Data > Varieties screen, which just needs a simple
-- draft -> reviewed -> approved lifecycle gated to Admin for the final
-- approval step, not the full breeding pipeline.
CREATE TABLE crop_varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  crop VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(60),
  breeder_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reviewed', 'approved')),
  created_by VARCHAR(100) NOT NULL,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crop, name)
);

CREATE INDEX idx_crop_varieties_crop ON crop_varieties (crop);
CREATE INDEX idx_crop_varieties_status ON crop_varieties (status);
CREATE INDEX idx_crop_varieties_breeder_organization_id ON crop_varieties (breeder_organization_id);

CREATE TRIGGER trg_crop_varieties_touch_updated_at
BEFORE UPDATE ON crop_varieties
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
