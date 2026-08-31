-- Nullable so existing rows (created before this feature) remain valid;
-- the application layer requires every new seed lot to resolve an owning
-- organization based on the authenticated user's role.
ALTER TABLE seed_lots
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

CREATE INDEX idx_seed_lots_organization_id ON seed_lots (organization_id);
