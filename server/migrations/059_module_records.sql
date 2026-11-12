-- Generic record store for modules that do not yet have dedicated tables
-- (Procurement, Warehouse, Processing, R&D, portals). Each module's records
-- live in a named collection as JSON documents, so every screen in those
-- modules saves to the database, is shared between users and devices, and
-- is written to the audit log. A module can later move to dedicated tables
-- by reading its collection out of here.

CREATE TABLE module_records (
  collection VARCHAR(80) NOT NULL CHECK (collection ~ '^[a-z][a-z0-9_.-]*$'),
  record_id VARCHAR(160) NOT NULL,
  data JSONB NOT NULL,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by VARCHAR(150) NOT NULL,
  updated_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (collection, record_id)
);

CREATE INDEX idx_module_records_live ON module_records (collection, position) WHERE deleted_at IS NULL;

-- One row per collection that has been initialised with its starter data,
-- so deleting every record never brings the starter data back.
CREATE TABLE module_collections (
  collection VARCHAR(80) PRIMARY KEY,
  seeded_by VARCHAR(150) NOT NULL,
  seeded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
