-- Farmer-Centric Seed Allocation & Distribution (Extend #9): the Farmer
-- Portal's "Request Seed Lot" flow lets a farmer search real seed lot
-- inventory (the same search engine Extend #18 built) and add specific
-- lots to a cart, rather than only naming a crop/variety for staff to
-- match later. This column records that farmer-picked lot on the request
-- itself. It is nullable and optional — the existing staff-facing "Request
-- Seed Lot" form (SeedFarmerProgram.tsx) still only captures crop/variety,
-- so those requests leave this null and go through the original two-step
-- approve -> (staff manually) fulfill flow, completely unchanged.
ALTER TABLE seed_requests ADD COLUMN requested_seed_lot_id UUID REFERENCES seed_lots(id) ON DELETE SET NULL;
