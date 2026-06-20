-- 007_restaurants.sql

CREATE TABLE restaurant_tiers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id           UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  name                    TEXT NOT NULL,
  default_payout_rate_ugx BIGINT NOT NULL CHECK (default_payout_rate_ugx > 0),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, name)
);

CREATE TABLE restaurants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  tier_id         UUID NOT NULL REFERENCES restaurant_tiers(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  status          restaurant_status NOT NULL DEFAULT 'pending',
  operating_hours JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, slug)
);

CREATE TABLE restaurant_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  address       TEXT NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role          user_role NOT NULL CHECK (role IN ('restaurant_staff', 'restaurant_manager')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);

CREATE TABLE payout_rate_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  semester_id     UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  payout_rate_ugx BIGINT NOT NULL CHECK (payout_rate_ugx > 0),
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, semester_id)
);

CREATE TABLE sauces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

CREATE TABLE restaurant_sauce_pricing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sauce_id          UUID NOT NULL REFERENCES sauces(id) ON DELETE CASCADE,
  internal_cost_ugx BIGINT NOT NULL CHECK (internal_cost_ugx > 0),
  effective_from    DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to      DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE included_foods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (restaurant_id, name)
);

CREATE TABLE extras (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price_ugx     BIGINT NOT NULL CHECK (price_ugx > 0),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

CREATE TABLE extra_price_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extra_id       UUID NOT NULL REFERENCES extras(id) ON DELETE CASCADE,
  price_ugx      BIGINT NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_menus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  sauce_id        UUID NOT NULL REFERENCES sauces(id) ON DELETE CASCADE,
  menu_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  stock_remaining INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, sauce_id, menu_date)
);

CREATE INDEX idx_daily_menus_restaurant_date
  ON daily_menus (restaurant_id, menu_date);

CREATE TABLE restaurant_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  business_name TEXT NOT NULL,
  contact_name  TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address       TEXT NOT NULL,
  description   TEXT,
  status        restaurant_application_status NOT NULL DEFAULT 'submitted',
  reviewed_by   UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE restaurant_payout_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  account_type    TEXT NOT NULL CHECK (account_type IN ('mtn_momo', 'airtel_money', 'bank')),
  account_name    TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
