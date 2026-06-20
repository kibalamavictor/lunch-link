-- 005_wallets.sql

CREATE TABLE student_wallets (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  semester_id               UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  swipe_balance             INT NOT NULL DEFAULT 0 CHECK (swipe_balance >= 0),
  dining_plus_balance_ugx   BIGINT NOT NULL DEFAULT 0 CHECK (dining_plus_balance_ugx >= 0),
  dining_cash_balance_ugx   BIGINT NOT NULL DEFAULT 0 CHECK (dining_cash_balance_ugx >= 0),
  latest_plan_purchase_id   UUID,
  semester_expires_at       TIMESTAMPTZ NOT NULL,
  wallet_status             wallet_status NOT NULL DEFAULT 'active',
  version                   INT NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  wallet_type     wallet_type NOT NULL,
  delta           BIGINT NOT NULL,
  balance_after   BIGINT NOT NULL,
  reason          ledger_reason NOT NULL,
  reference_type  TEXT NOT NULL,
  reference_id    UUID NOT NULL,
  request_id      UUID,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reference_type, reference_id, wallet_type)
);

CREATE INDEX idx_wallet_ledger_student_created
  ON wallet_ledger_entries (student_id, created_at DESC);

CREATE TABLE wallet_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  wallet_type     wallet_type NOT NULL,
  delta           BIGINT NOT NULL,
  reason          TEXT NOT NULL,
  requested_by    UUID NOT NULL REFERENCES auth.users(id),
  approved_by     UUID REFERENCES auth.users(id),
  ledger_entry_id UUID REFERENCES wallet_ledger_entries(id),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger_entries is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallet_ledger_no_update
  BEFORE UPDATE OR DELETE ON wallet_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
