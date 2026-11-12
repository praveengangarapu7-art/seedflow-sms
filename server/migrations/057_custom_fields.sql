-- Admin-defined custom fields. A field is defined once and applies to one or
-- more entity types spread across modules; values are stored per record. A
-- field that applies to seed_lot is stored against the lot, so every module
-- that shows that lot (lab, quality, processing, warehouse) reads and writes
-- the same value.

CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key VARCHAR(50) NOT NULL UNIQUE CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),
  label VARCHAR(100) NOT NULL,
  field_type VARCHAR(10) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  entity_types TEXT[] NOT NULL CHECK (cardinality(entity_types) > 0),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  help_text VARCHAR(200),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  value JSONB,
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (field_id, entity_type, entity_id)
);

CREATE INDEX idx_custom_field_values_entity ON custom_field_values (entity_type, entity_id);
