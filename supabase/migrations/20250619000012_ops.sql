-- 012_ops.sql

CREATE TABLE fraud_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID REFERENCES students(id),
  restaurant_id UUID REFERENCES restaurants(id),
  alert_type    TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'medium',
  status        fraud_alert_status NOT NULL DEFAULT 'open',
  details       JSONB NOT NULL DEFAULT '{}',
  assigned_to   UUID REFERENCES auth.users(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_alerts_open
  ON fraud_alerts (status)
  WHERE status IN ('open', 'investigating');

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel     notification_channel NOT NULL,
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id),
  action      audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  payload     JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_created ON audit_events (created_at DESC);

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_events_no_update
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TABLE refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  payment_id      UUID REFERENCES payments(id),
  transaction_id  UUID REFERENCES transactions(id),
  amount_ugx      BIGINT NOT NULL CHECK (amount_ugx > 0),
  reason          TEXT NOT NULL,
  issued_by       UUID NOT NULL REFERENCES auth.users(id),
  ledger_entry_id UUID REFERENCES wallet_ledger_entries(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_university_stats (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id         UUID NOT NULL REFERENCES universities(id),
  stat_date             DATE NOT NULL,
  plan_collections_ugx  BIGINT NOT NULL DEFAULT 0,
  topup_collections_ugx BIGINT NOT NULL DEFAULT 0,
  swipes_redeemed       INT NOT NULL DEFAULT 0,
  swipe_liability_ugx   BIGINT NOT NULL DEFAULT 0,
  extras_volume_ugx     BIGINT NOT NULL DEFAULT 0,
  new_students          INT NOT NULL DEFAULT 0,
  UNIQUE (university_id, stat_date)
);

CREATE TABLE daily_restaurant_stats (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id      UUID NOT NULL REFERENCES restaurants(id),
  stat_date          DATE NOT NULL,
  swipes_redeemed    INT NOT NULL DEFAULT 0,
  extras_revenue_ugx BIGINT NOT NULL DEFAULT 0,
  unique_students    INT NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, stat_date)
);
