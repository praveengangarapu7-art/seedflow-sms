-- "Blockchain-style" traceability, built honestly from its actual useful
-- parts (a hash chain + a digital signature) rather than standing up real
-- distributed-ledger infrastructure, which would be wildly disproportionate
-- for what's being asked: independent, offline-checkable proof that a lot's
-- recorded history hasn't been altered.
--
-- signing_keys: the "issuing authority" keypair. Storing the private key in
-- the app database (rather than a KMS/HSM) is a demo-scale simplification —
-- flagged here deliberately, the same way earlier migrations flag their own
-- simplifications (e.g. the crop-planning seed-rate constants).
CREATE TABLE signing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm VARCHAR(20) NOT NULL DEFAULT 'ed25519',
  public_key_pem TEXT NOT NULL,
  private_key_pem TEXT NOT NULL,
  fingerprint VARCHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per significant event in a seed lot's life (CREATE, UPDATE,
-- ALLOCATE, RELEASE, ...). record_hash = SHA-256(seed_lot_id, sequence_number,
-- event_type, canonical(snapshot), previous_hash, created_at) — each row
-- cryptographically references the row before it for the SAME lot, so
-- altering any historical snapshot in place breaks every record_hash after
-- it. sequence_number starts at 1 with previous_hash = 64 zeros (the
-- "genesis" value, standard in hash-chain/blockchain designs).
CREATE TABLE seed_lot_hash_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  sequence_number INT NOT NULL CHECK (sequence_number > 0),
  event_type VARCHAR(30) NOT NULL,
  snapshot JSONB NOT NULL,
  previous_hash VARCHAR(64) NOT NULL,
  record_hash VARCHAR(64) NOT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seed_lot_id, sequence_number)
);

CREATE INDEX idx_seed_lot_hash_chain_seed_lot_id ON seed_lot_hash_chain (seed_lot_id);

-- A signed snapshot of a lot's chain tip at a point in time — the
-- "verifiable digital certificate" a farmer scans via QR. chain_length +
-- latest_hash + signature let a verifier who fetched (or otherwise obtained)
-- this certificate confirm authenticity without trusting the database at
-- all: recompute the chain from an exported bundle, then check the
-- signature against the issuing key's public_key_pem.
CREATE TABLE lot_authenticity_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  certificate_number VARCHAR(60) NOT NULL UNIQUE,
  chain_length INT NOT NULL,
  latest_hash VARCHAR(64) NOT NULL,
  signing_key_id UUID NOT NULL REFERENCES signing_keys(id) ON DELETE RESTRICT,
  signature TEXT NOT NULL,
  issued_by VARCHAR(100) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by VARCHAR(100),
  revoked_reason TEXT
);

CREATE INDEX idx_lot_authenticity_certificates_seed_lot_id ON lot_authenticity_certificates (seed_lot_id);
