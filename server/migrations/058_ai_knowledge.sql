-- Knowledge base behind SeedSphere AI retrieval (RAG). Documents come from two
-- places: curated seed-industry / how-to articles, and the company's own
-- records (SOPs, compliance requirements, NCRs, CAPAs, complaints), re-indexed
-- on demand. Retrieval uses PostgreSQL full-text search with weighted fields,
-- so it needs no extra extension or vector service.

CREATE TABLE ai_knowledge_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('article', 'sop', 'compliance', 'ncr', 'capa', 'complaint')),
  source_ref VARCHAR(120) NOT NULL,
  title VARCHAR(250) NOT NULL,
  module VARCHAR(40) NOT NULL,
  path VARCHAR(200) NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(tags, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C')
  ) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_type, source_ref)
);

CREATE INDEX idx_ai_knowledge_docs_tsv ON ai_knowledge_docs USING GIN (tsv);
