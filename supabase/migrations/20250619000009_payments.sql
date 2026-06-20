-- 009_payments.sql

CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  type                  payment_type NOT NULL,
  provider              payment_provider NOT NULL,
  amount_ugx            BIGINT NOT NULL CHECK (amount_ugx > 0),
  flutterwave_tx_ref    TEXT NOT NULL UNIQUE,
  flutterwave_id        TEXT,
  status                payment_status NOT NULL DEFAULT 'pending',
  meal_plan_id          UUID REFERENCES meal_plans(id),
  phone_number          TEXT NOT NULL,
  expires_at            TIMESTAMPTZ,
  idempotency_key       TEXT UNIQUE,
  reconciliation_status TEXT NOT NULL DEFAULT 'unmatched',
  metadata              JSONB NOT NULL DEFAULT '{}',
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_status_expires
  ON payments (status, expires_at)
  WHERE status = 'pending';

ALTER TABLE student_plan_purchases
  ADD CONSTRAINT fk_plan_purchase_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id);
