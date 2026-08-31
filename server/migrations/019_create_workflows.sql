-- Multi-stage Certified Seed Production workflow: Foundation lot ->
-- pre-certified inspection -> certified production -> quality testing ->
-- market-ready release. One workflow_instances row per run; five
-- workflow_stages rows (one per stage) track each stage's own
-- approval-gate state and due date independently.
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  certified_lot_id UUID REFERENCES seed_lots(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_by VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_instances_seed_lot_id ON workflow_instances (seed_lot_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances (status);

CREATE TRIGGER trg_workflow_instances_touch_updated_at
BEFORE UPDATE ON workflow_instances
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

CREATE TABLE workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  stage_key VARCHAR(30) NOT NULL CHECK (stage_key IN (
    'FOUNDATION_LOT', 'PRE_CERTIFIED_INSPECTION', 'CERTIFIED_PRODUCTION', 'QUALITY_TESTING', 'MARKET_READY_RELEASE'
  )),
  sequence INT NOT NULL,
  department VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'approved', 'rejected')),
  started_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workflow_stages_workflow_stage UNIQUE (workflow_id, stage_key)
);

CREATE INDEX idx_workflow_stages_workflow_id ON workflow_stages (workflow_id);
CREATE INDEX idx_workflow_stages_status ON workflow_stages (status);

CREATE TRIGGER trg_workflow_stages_touch_updated_at
BEFORE UPDATE ON workflow_stages
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
