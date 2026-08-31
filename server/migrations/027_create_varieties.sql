-- Variety catalog: identity attributes (crop, name, botanical name, local
-- names) live on the root row since they don't change season to season.
-- Traits that DO drift over seasons (yield, disease resistance, suitability,
-- market demand) live on variety_versions instead, following the same
-- draft -> issued -> superseded lifecycle already used by quality_certificates.
CREATE TABLE varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop VARCHAR(100) NOT NULL,
  variety_name VARCHAR(100) NOT NULL,
  botanical_name VARCHAR(150) NOT NULL,
  local_names JSONB NOT NULL DEFAULT '[]',
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'deprecated')),
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crop, variety_name)
);

CREATE INDEX idx_varieties_crop ON varieties (crop);
CREATE INDEX idx_varieties_status ON varieties (status);
CREATE INDEX idx_varieties_organization_id ON varieties (organization_id);

-- market_demand_trend/yield/etc are nullable here because a version can exist
-- as an in-progress draft before all fields are filled in — the "quality
-- gate" that requires them is enforced in the application layer only at
-- submit-for-review time, not by a NOT NULL constraint.
CREATE TABLE variety_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variety_id UUID NOT NULL REFERENCES varieties(id) ON DELETE RESTRICT,
  version INT NOT NULL CHECK (version > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'superseded')),
  season VARCHAR(50) NOT NULL,
  agro_climatic_suitability JSONB NOT NULL DEFAULT '[]',
  yield_benchmark_per_acre NUMERIC(10, 2),
  yield_unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  disease_resistance_profile JSONB NOT NULL DEFAULT '[]',
  market_demand_trend VARCHAR(20) CHECK (market_demand_trend IN ('rising', 'stable', 'declining')),
  notes TEXT,
  submitted_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (variety_id, version)
);

CREATE INDEX idx_variety_versions_variety_id ON variety_versions (variety_id);

CREATE TABLE variety_committee_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variety_version_id UUID NOT NULL REFERENCES variety_versions(id) ON DELETE RESTRICT,
  reviewer VARCHAR(100) NOT NULL,
  reviewer_role VARCHAR(30) NOT NULL,
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  comments TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variety_committee_reviews_version_id ON variety_committee_reviews (variety_version_id);
