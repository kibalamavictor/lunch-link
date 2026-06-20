-- 003_settings.sql

CREATE TABLE platform_settings (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton                      BOOLEAN NOT NULL DEFAULT true UNIQUE CHECK (singleton = true),
  default_timezone               TEXT NOT NULL DEFAULT 'Africa/Kampala',
  pending_payment_ttl_min        INT NOT NULL DEFAULT 15,
  qr_token_ttl_seconds           INT NOT NULL DEFAULT 120,
  validation_session_ttl_seconds INT NOT NULL DEFAULT 300,
  global_redemption_cooldown_hours INT NOT NULL DEFAULT 3,
  global_daily_swipe_limit       INT NOT NULL DEFAULT 2,
  wallet_reconciliation_enabled  BOOLEAN NOT NULL DEFAULT true,
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE university_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id               UUID NOT NULL UNIQUE REFERENCES universities(id) ON DELETE RESTRICT,
  timezone                    TEXT NOT NULL DEFAULT 'Africa/Kampala',
  default_swipe_rate_ugx      BIGINT NOT NULL CHECK (default_swipe_rate_ugx > 0),
  dining_cash_topup_min_ugx   BIGINT NOT NULL DEFAULT 5000,
  dining_cash_topup_max_ugx   BIGINT NOT NULL DEFAULT 500000,
  redemption_cooldown_hours   INT,
  daily_swipe_limit           INT,
  low_swipe_threshold         INT NOT NULL DEFAULT 5,
  low_dining_plus_threshold_ugx BIGINT NOT NULL DEFAULT 10000,
  settings                    JSONB NOT NULL DEFAULT '{}',
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feature_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  feature_key   TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT false,
  description   TEXT,
  UNIQUE (university_id, feature_key)
);
