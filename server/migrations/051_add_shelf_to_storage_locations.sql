-- Warehouse Cold Storage & Shelf-Life Management (Extend #11): the existing
-- storage_locations table already tracks a warehouse_zone (freeform, e.g.
-- "Cold Storage A") and target temperature/humidity — this adds the shelf
-- as its own field, since the prompt names Zone and Shelf as two separate
-- axes of a location (e.g. Zone A, Shelf 3), not one combined string.
-- Nullable: existing locations, and any raw-SQL test fixture, don't need one.
ALTER TABLE storage_locations
  ADD COLUMN shelf VARCHAR(20);
