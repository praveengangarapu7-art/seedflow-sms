-- Postgres never auto-indexes a foreign key column — only the referenced
-- side (the PK being pointed at) gets one automatically. These eight FK
-- columns were added across earlier migrations without a matching index,
-- found via a systematic audit of every REFERENCES clause against every
-- CREATE INDEX in this migrations directory (not a guess).
CREATE INDEX idx_workflow_instances_certified_lot_id ON workflow_instances (certified_lot_id);
CREATE INDEX idx_purchase_orders_fulfilled_seed_lot_id ON purchase_orders (fulfilled_seed_lot_id);
CREATE INDEX idx_crop_plans_seed_lot_id ON crop_plans (seed_lot_id);
CREATE INDEX idx_crop_plans_variety_id ON crop_plans (variety_id);
CREATE INDEX idx_crop_plans_allocation_id ON crop_plans (allocation_id);
CREATE INDEX idx_seed_requests_allocation_id ON seed_requests (allocation_id);
CREATE INDEX idx_lab_quality_flags_submission_id ON lab_quality_flags (submission_id);
CREATE INDEX idx_phytosanitary_certificates_submission_id ON phytosanitary_certificates (submission_id);
