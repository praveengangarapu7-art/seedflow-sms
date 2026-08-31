-- Adds the fields the "Batch Operations for Seed Lots" quick actions
-- (Move to Storage Zone, Approve for Sale, Mark as Expired) need directly on
-- seed_lots.
--
-- storage_zone: a simple freeform "which warehouse zone is this *bulk* lot
-- sitting in" field on the raw lot record itself. This is deliberately NOT
-- the same thing as storage_locations/storage_assignments
-- (023_create_storage.sql), which is a richer, capacity-tracked,
-- move-history-audited system that intentionally operates on
-- packaging_batches rather than bulk seed_lots (see that migration's header
-- comment: "a warehouse assigns rack/cold-storage space to bags, not to an
-- abstract lot record"). A raw, unpackaged lot has no packaging unit to
-- occupy a rack slot, so it can't use that system — but batch operations on
-- seed lots still need *some* real place to record "which zone is this
-- whole lot in", hence this plain column. The frontend reuses the same
-- warehouse_zone values already seeded in storage_locations (surfaced via
-- the existing search filter-options endpoint) purely as suggestions, so
-- the two concepts read as consistent without being backed by the same
-- table or carrying the same audit/capacity guarantees.
--
-- approved_for_sale: a new, narrow "cleared for sale" flag, deliberately
-- distinct from both testing_status (the lab certification pipeline —
-- driven by actual submitted lab samples, not an ad hoc batch action) and
-- available_for_partner_order (an unrelated opt-in to the third-party
-- partner catalog for Foundation-stage lots only). "Approve for Sale" here
-- is its own simple gate any write-capable role can flip in bulk.
--
-- expired: seed lots age out and become unusable independent of whether
-- they were ever allocated or archived — the existing status values
-- (active/depleted/archived) don't cover that case, so this adds a fourth,
-- genuinely new terminal status rather than repurposing 'archived' (archival
-- is a distinct, deliberate data-governance action — see
-- dataGovernance.service.ts — not the same event as a lot physically
-- expiring).
ALTER TABLE seed_lots ADD COLUMN storage_zone VARCHAR(100);
ALTER TABLE seed_lots ADD COLUMN approved_for_sale BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE seed_lots DROP CONSTRAINT seed_lots_status_check;
ALTER TABLE seed_lots ADD CONSTRAINT seed_lots_status_check
  CHECK (status IN ('active', 'depleted', 'archived', 'expired'));
