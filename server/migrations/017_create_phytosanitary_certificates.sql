CREATE TABLE phytosanitary_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  certificate_number VARCHAR(60) NOT NULL UNIQUE,
  issuing_authority VARCHAR(150) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'revoked')),
  issued_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_phyto_expiry_after_issue CHECK (expiry_date IS NULL OR expiry_date >= issue_date)
);

CREATE INDEX idx_phytosanitary_certificates_seed_lot_id ON phytosanitary_certificates (seed_lot_id);
