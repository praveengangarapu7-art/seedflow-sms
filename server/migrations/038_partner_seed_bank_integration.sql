-- Third-Party Seed Bank Integration: lets one organization act as a "seed
-- bank" partner offering Foundation-stage lots to other organizations, with
-- an explicit partnership handshake, an ordering/fulfillment workflow,
-- inventory-sync auditing, and a performance-rating rollup computed from
-- historical order outcomes. Every organization already in this system can
-- play either role (buyer or seed-bank partner) — there's no separate
-- "external partner" entity, since `organizations` already models every org
-- symmetrically and a real external-network integration would require a
-- second deployment to actually be external to.

-- A lot must be explicitly opted in by its owning organization before any
-- other org can see or order it via the partner catalog.
ALTER TABLE seed_lots ADD COLUMN available_for_partner_order BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_seed_lots_partner_catalog ON seed_lots (stage, available_for_partner_order) WHERE available_for_partner_order = true;

-- The partnership handshake: an org must request, and the other org's Admin
-- must approve, before orders can flow between them.
CREATE TABLE partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  partner_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  requested_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  CHECK (requesting_org_id <> partner_org_id),
  UNIQUE (requesting_org_id, partner_org_id)
);
CREATE INDEX idx_partner_links_requesting_org ON partner_links (requesting_org_id);
CREATE INDEX idx_partner_links_partner_org ON partner_links (partner_org_id);

-- The ordering workflow: requested -> confirmed (automatically, if the
-- partner's lot currently has enough available quantity, else left for
-- manual confirm) -> shipped (partner's stock is decremented for real at
-- this point) -> received (buyer gets a new seed lot of their own) or
-- disputed. rejected/cancelled are terminal side branches.
CREATE TABLE partner_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(60) NOT NULL UNIQUE,
  buyer_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  partner_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100) NOT NULL,
  quantity_requested NUMERIC NOT NULL CHECK (quantity_requested > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  status VARCHAR(20) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'rejected', 'shipped', 'received', 'disputed', 'cancelled')),
  allocation_id UUID REFERENCES seed_lot_allocations(id) ON DELETE RESTRICT,
  received_seed_lot_id UUID REFERENCES seed_lots(id) ON DELETE RESTRICT,
  requested_by VARCHAR(100) NOT NULL,
  confirmed_by VARCHAR(100),
  rejection_reason TEXT,
  dispute_reason TEXT,
  quality_rating_at_receipt SMALLINT CHECK (quality_rating_at_receipt BETWEEN 1 AND 5),
  on_time BOOLEAN,
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (buyer_org_id <> partner_org_id)
);
CREATE INDEX idx_partner_orders_buyer_org ON partner_orders (buyer_org_id);
CREATE INDEX idx_partner_orders_partner_org ON partner_orders (partner_org_id);
CREATE INDEX idx_partner_orders_status ON partner_orders (status);
CREATE INDEX idx_partner_orders_seed_lot ON partner_orders (seed_lot_id);

-- Rolled-up scorecard per (buyer, partner) pair, recomputed from
-- partner_orders history each time an order reaches a terminal outcome
-- (received/disputed/cancelled). Stored rather than computed on every read
-- so a catalog listing can show a partner's reputation without an
-- aggregation query per row.
CREATE TABLE partner_performance_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_orders INT NOT NULL DEFAULT 0,
  fulfilled_orders INT NOT NULL DEFAULT 0,
  disputed_orders INT NOT NULL DEFAULT 0,
  cancelled_orders INT NOT NULL DEFAULT 0,
  on_time_orders INT NOT NULL DEFAULT 0,
  avg_quality_rating NUMERIC(3, 2),
  overall_score NUMERIC(5, 1),
  last_order_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (buyer_org_id, partner_org_id)
);
CREATE INDEX idx_partner_ratings_partner_org ON partner_performance_ratings (partner_org_id);

-- Since both orgs live in the same database, there's no real network to
-- synchronize over — a live query already reflects the partner's current
-- inventory. This log gives "inventory synchronization" real, auditable
-- substance anyway: an explicit, timestamped record of when a buyer's view
-- was refreshed and what it showed, the same honesty tradeoff as treating
-- "blockchain-style" as a hash chain rather than standing up real
-- distributed-ledger infrastructure.
CREATE TABLE partner_inventory_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  synced_by VARCHAR(100) NOT NULL,
  lots_synced INT NOT NULL,
  total_available_quantity NUMERIC NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partner_sync_log_pair ON partner_inventory_sync_log (buyer_org_id, partner_org_id, synced_at DESC);
