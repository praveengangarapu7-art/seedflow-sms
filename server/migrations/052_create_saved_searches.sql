-- Seed Lot Search & Discovery Interface (Extend #18): "Save Search" lets a
-- user store a named filter combination and re-run it later from "My
-- Searches" without re-entering every field. Scoped per-user (not
-- per-organization or global) since a saved search is a personal shortcut,
-- same way a saved view/filter works in most search UIs. filters is stored
-- as opaque JSONB (the exact shape of SeedLotSearchFilters) rather than a
-- column per filter field, so this table never needs a migration when the
-- search feature grows a new filter.
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX idx_saved_searches_user_id ON saved_searches (user_id);
