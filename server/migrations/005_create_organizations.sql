CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('breeder', 'producer', 'laboratory', 'certification_agency', 'warehouse', 'dealer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_touch_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
