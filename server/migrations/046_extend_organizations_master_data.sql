-- Extends organizations with the fields the master-data Organization screen
-- has always sent (location, contact person) plus an active/inactive flag —
-- previously silently dropped since the table only had name/type. Nullable
-- (active excepted) so every existing row, and every other module that only
-- ever inserted name/type, keeps working unchanged.
ALTER TABLE organizations ADD COLUMN location VARCHAR(200);
ALTER TABLE organizations ADD COLUMN contact_person VARCHAR(150);
ALTER TABLE organizations ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_organizations_active ON organizations (active);
