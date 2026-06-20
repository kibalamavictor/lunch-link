-- 008_qr_transactions.sql

CREATE TABLE qr_tokens (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  token_hash                TEXT NOT NULL UNIQUE,
  jti                       UUID NOT NULL UNIQUE,
  issued_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                TIMESTAMPTZ NOT NULL,
  consumed_at               TIMESTAMPTZ,
  consumed_by_staff_id      UUID REFERENCES staff_accounts(id),
  consumed_at_restaurant_id UUID REFERENCES restaurants(id),
  device_fingerprint        TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > issued_at)
);

CREATE INDEX idx_qr_tokens_student_active
  ON qr_tokens (student_id, consumed_at)
  WHERE consumed_at IS NULL;

CREATE TABLE transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  transaction_type NOT NULL,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  university_id         UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE RESTRICT,
  staff_id              UUID REFERENCES staff_accounts(id) ON DELETE RESTRICT,
  sauce_id              UUID REFERENCES sauces(id) ON DELETE RESTRICT,
  swipe_delta           INT NOT NULL DEFAULT 0,
  dining_plus_delta_ugx BIGINT NOT NULL DEFAULT 0,
  dining_cash_delta_ugx BIGINT NOT NULL DEFAULT 0,
  receipt_number        TEXT UNIQUE,
  excluded_from_payout  BOOLEAN NOT NULL DEFAULT false,
  voided_at             TIMESTAMPTZ,
  idempotency_key       TEXT UNIQUE,
  request_id            UUID,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transaction_extras (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id       UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  extra_id             UUID NOT NULL REFERENCES extras(id) ON DELETE RESTRICT,
  quantity             INT NOT NULL CHECK (quantity > 0),
  unit_price_ugx       BIGINT NOT NULL,
  total_price_ugx      BIGINT NOT NULL,
  dining_plus_used_ugx BIGINT NOT NULL DEFAULT 0,
  dining_cash_used_ugx BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_transactions_student_created
  ON transactions (student_id, created_at DESC);

CREATE INDEX idx_transactions_restaurant_created
  ON transactions (restaurant_id, created_at DESC);

CREATE INDEX idx_transactions_payout
  ON transactions (restaurant_id, created_at)
  WHERE type = 'meal_redemption' AND NOT excluded_from_payout;

CREATE TABLE validation_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_token_id    UUID NOT NULL REFERENCES qr_tokens(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  restaurant_id  UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id       UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  status         validation_session_status NOT NULL DEFAULT 'active',
  expires_at     TIMESTAMPTZ NOT NULL,
  consumed_at    TIMESTAMPTZ,
  transaction_id UUID REFERENCES transactions(id),
  request_id     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_validation_sessions_active
  ON validation_sessions (id, status)
  WHERE status = 'active';

CREATE TABLE device_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  device_fingerprint  TEXT NOT NULL,
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  qr_generation_count INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, device_fingerprint)
);
