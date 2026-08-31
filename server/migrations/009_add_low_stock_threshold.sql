ALTER TABLE seed_lots
  ADD COLUMN low_stock_threshold NUMERIC(12, 2) NOT NULL DEFAULT 100
  CHECK (low_stock_threshold >= 0);
