-- Seed Testing & Certification Integration (Extend #15): the lab-testing
-- module (migration 028) already tracks submissions/results per seed lot,
-- but nothing on the seed lot itself reflected the outcome. This column is
-- that certification-status axis — distinct from both `status` (inventory
-- lifecycle: active/depleted/archived) and `stage` (breeding-pipeline rank:
-- Breeder/Foundation/Certified, enforced by the genealogy triggers). It is
-- driven entirely by the lab-testing workflow:
--   not_submitted -> testing (a sample batch is submitted)
--                 -> certified (every requested test passed)
--                 -> rejected  (any requested test failed)
-- A lot can be resubmitted after a rejection, which moves it back to
-- 'testing'.
ALTER TABLE seed_lots
  ADD COLUMN testing_status VARCHAR(20) NOT NULL DEFAULT 'not_submitted'
  CHECK (testing_status IN ('not_submitted', 'testing', 'certified', 'rejected'));

CREATE INDEX idx_seed_lots_testing_status ON seed_lots (testing_status);
