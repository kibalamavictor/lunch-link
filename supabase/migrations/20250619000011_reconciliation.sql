-- 011_reconciliation.sql

CREATE TABLE reconciliation_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type          reconciliation_type NOT NULL,
  status            reconciliation_status NOT NULL DEFAULT 'running',
  university_id     UUID REFERENCES universities(id),
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ,
  records_checked   INT NOT NULL DEFAULT 0,
  discrepancy_count INT NOT NULL DEFAULT 0,
  summary           JSONB NOT NULL DEFAULT '{}',
  started_by        UUID REFERENCES auth.users(id),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE TABLE flutterwave_webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_ref            TEXT NOT NULL,
  flutterwave_id    TEXT,
  event_type        TEXT NOT NULL,
  raw_payload       JSONB NOT NULL,
  signature_valid   BOOLEAN NOT NULL,
  processing_status webhook_processing_status NOT NULL DEFAULT 'received',
  payment_id        UUID REFERENCES payments(id),
  error_message     TEXT,
  request_id        UUID,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ
);

CREATE INDEX idx_fw_webhook_tx_ref ON flutterwave_webhook_events (tx_ref);

CREATE TABLE flutterwave_settlement_lines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_run_id UUID REFERENCES reconciliation_runs(id),
  settlement_date       DATE NOT NULL,
  tx_ref                TEXT,
  flutterwave_id        TEXT,
  amount_ugx            BIGINT NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'UGX',
  matched_payment_id    UUID REFERENCES payments(id),
  match_status          TEXT NOT NULL DEFAULT 'unmatched',
  raw_data              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_reconciliation_issues (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_run_id UUID NOT NULL REFERENCES reconciliation_runs(id),
  student_id            UUID REFERENCES students(id),
  payment_id            UUID REFERENCES payments(id),
  issue_type            TEXT NOT NULL,
  expected_value        BIGINT,
  actual_value          BIGINT,
  details               JSONB NOT NULL DEFAULT '{}',
  resolved              BOOLEAN NOT NULL DEFAULT false,
  resolved_by           UUID REFERENCES auth.users(id),
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_webhook_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'flutterwave_webhook_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_webhook_events_no_update
  BEFORE UPDATE OR DELETE ON flutterwave_webhook_events
  FOR EACH ROW EXECUTE FUNCTION prevent_webhook_mutation();
