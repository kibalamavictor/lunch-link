-- 006_meal_plans.sql

CREATE TABLE meal_plans (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id              UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  semester_id                UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  name                       TEXT NOT NULL,
  description                TEXT,
  swipe_allocation           INT NOT NULL CHECK (swipe_allocation > 0),
  dining_plus_allocation_ugx BIGINT NOT NULL DEFAULT 0 CHECK (dining_plus_allocation_ugx >= 0),
  price_ugx                  BIGINT NOT NULL CHECK (price_ugx > 0),
  is_active                  BOOLEAN NOT NULL DEFAULT true,
  sort_order                 INT NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_plan_purchases (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  meal_plan_id            UUID NOT NULL REFERENCES meal_plans(id) ON DELETE RESTRICT,
  payment_id              UUID NOT NULL UNIQUE,
  swipes_granted          INT NOT NULL,
  dining_plus_granted_ugx BIGINT NOT NULL,
  plan_price_ugx          BIGINT NOT NULL,
  purchased_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE student_wallets
  ADD CONSTRAINT fk_latest_plan_purchase
  FOREIGN KEY (latest_plan_purchase_id) REFERENCES student_plan_purchases(id);
