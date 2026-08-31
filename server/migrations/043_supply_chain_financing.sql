-- Supply Chain Financing & Credit Programs. Unlike most features this
-- session, this one is legitimately about real money — loan principal,
-- interest, repayment — so genuine monetary fields are appropriate here
-- (not the "avoid fabricating currency" stance taken where no real cost
-- basis existed, e.g. breeding-program ROI). This is still an internal
-- financial record-keeping/workflow system, not a real payment gateway or
-- bank integration — no money actually moves through this table, the same
-- honest scope subsidy_claims already established (it tracks claim_amount
-- and payment_reference without disbursing funds through a real processor).
--
-- One unified table covers all three financing products (a discriminated
-- union via financing_type) rather than three parallel tables with
-- duplicated status-machine logic — the lifecycle
-- (requested -> approved -> disbursed -> repaying -> repaid, with
-- rejected/defaulted as terminal branches) is identical across all three;
-- only the borrower and a few type-specific fields differ.
CREATE TABLE financing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financing_type VARCHAR(30) NOT NULL CHECK (financing_type IN ('breeder_credit', 'farmer_microfinance', 'warehouse_receivables')),
  -- Exactly one borrower is set, matching which type this is: an
  -- organization for breeder_credit/warehouse_receivables, a farmer for
  -- farmer_microfinance.
  borrower_organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  borrower_farmer_id UUID REFERENCES farmers(id) ON DELETE RESTRICT,
  -- What this financing flows through — the Foundation lot being funded
  -- (breeder_credit), the lot a farmer is financing their purchase of
  -- (farmer_microfinance), or the lot whose allocation created the
  -- receivable being advanced against (warehouse_receivables).
  seed_lot_id UUID REFERENCES seed_lots(id) ON DELETE RESTRICT,
  allocation_id UUID REFERENCES seed_lot_allocations(id) ON DELETE RESTRICT,
  principal_amount NUMERIC NOT NULL CHECK (principal_amount > 0),
  annual_interest_rate_percent NUMERIC NOT NULL CHECK (annual_interest_rate_percent >= 0),
  -- warehouse_receivables only: the full value of the underlying
  -- receivable being advanced against — always >= the cash actually
  -- advanced (principal_amount), the real-world "advance rate" discount.
  receivable_amount NUMERIC CHECK (receivable_amount IS NULL OR receivable_amount >= principal_amount),
  -- Crop insurance integration: a soft link (crop+season, matching how
  -- crop_insurance_records itself is keyed — see market_intelligence's
  -- migration 040) to existing recorded insurance data, purely informational
  -- risk context for this loan, not a new insurance-policy concept.
  linked_insurance_crop VARCHAR(100),
  linked_insurance_season VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected', 'disbursed', 'repaying', 'repaid', 'defaulted')),
  requested_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  disbursed_at TIMESTAMPTZ,
  -- Snapshotted (like subsidy_claims.claim_amount) the moment repayment is
  -- triggered post-harvest, not recomputed later — a subsequent rate change
  -- must never silently alter what's already been demanded.
  amount_due NUMERIC,
  repayment_due_date DATE,
  repaid_at TIMESTAMPTZ,
  repaid_amount NUMERIC,
  payment_reference VARCHAR(100),
  defaulted_at TIMESTAMPTZ,
  default_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (financing_type = 'farmer_microfinance' AND borrower_farmer_id IS NOT NULL AND borrower_organization_id IS NULL)
    OR (financing_type IN ('breeder_credit', 'warehouse_receivables') AND borrower_organization_id IS NOT NULL AND borrower_farmer_id IS NULL)
  )
);
CREATE INDEX idx_financing_accounts_org ON financing_accounts (borrower_organization_id);
CREATE INDEX idx_financing_accounts_farmer ON financing_accounts (borrower_farmer_id);
CREATE INDEX idx_financing_accounts_seed_lot ON financing_accounts (seed_lot_id);
CREATE INDEX idx_financing_accounts_allocation ON financing_accounts (allocation_id);
CREATE INDEX idx_financing_accounts_status ON financing_accounts (status);
