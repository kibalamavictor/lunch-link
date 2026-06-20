-- 010_payouts.sql

CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  semester_id     UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  meals_redeemed  INT NOT NULL DEFAULT 0,
  payout_rate_ugx BIGINT NOT NULL,
  amount_due_ugx  BIGINT NOT NULL,
  status          payout_status NOT NULL DEFAULT 'draft',
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  locked_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  rate_snapshot   JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, period_start, period_end)
);

CREATE TABLE payout_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id       UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  transaction_id  UUID NOT NULL UNIQUE REFERENCES transactions(id),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id),
  student_id      UUID NOT NULL REFERENCES students(id),
  swipe_rate_ugx  BIGINT NOT NULL,
  line_amount_ugx BIGINT NOT NULL DEFAULT 0,
  rate_source     TEXT NOT NULL CHECK (rate_source IN (
    'restaurant_specific', 'tier_default', 'university_default'
  )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
