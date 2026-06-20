-- LunchLink seed data (Sprint 0 — reference data only; auth users created in Sprint 1)

INSERT INTO platform_settings (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

INSERT INTO universities (id, name, slug, is_active)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Makerere University',
  'makerere',
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO semesters (
  id, university_id, name, code, start_date, end_date, is_active
)
VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'Semester I 2025/2026',
  '2025-S1',
  '2025-08-01',
  '2025-12-15',
  true
)
ON CONFLICT (university_id, code) DO NOTHING;

INSERT INTO university_settings (
  university_id,
  default_swipe_rate_ugx,
  dining_cash_topup_min_ugx,
  dining_cash_topup_max_ugx
)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  3500,
  5000,
  500000
)
ON CONFLICT (university_id) DO NOTHING;

INSERT INTO feature_flags (university_id, feature_key, enabled, description)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'meal_redemption',
    true,
    'Enable QR meal redemption'
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    'dining_cash_topup',
    true,
    'Enable Dining Cash top-ups'
  ),
  (
    NULL,
    'maintenance_mode',
    false,
    'Platform-wide maintenance flag'
  )
ON CONFLICT (university_id, feature_key) DO NOTHING;

INSERT INTO restaurant_tiers (id, university_id, name, default_payout_rate_ugx)
VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Standard',
    3500
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Premium',
    4000
  )
ON CONFLICT (university_id, name) DO NOTHING;

INSERT INTO restaurants (
  id, university_id, tier_id, name, slug, status, description
)
VALUES
  (
    'd0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'Campus Kitchen',
    'campus-kitchen',
    'active',
    'Pilot restaurant — main campus dining'
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'Food Court Express',
    'food-court-express',
    'active',
    'Pilot restaurant — food court location'
  )
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO payout_rate_configs (restaurant_id, semester_id, payout_rate_ugx)
VALUES
  (
    'd0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    3600
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000001',
    4100
  )
ON CONFLICT (restaurant_id, semester_id) DO NOTHING;

INSERT INTO meal_plans (
  id,
  university_id,
  semester_id,
  name,
  description,
  swipe_allocation,
  dining_plus_allocation_ugx,
  price_ugx,
  is_active,
  sort_order
)
VALUES
  (
    'e0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    'Basic Plan',
    '60 swipes, no Dining Plus',
    60,
    0,
    210000,
    true,
    1
  ),
  (
    'e0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    'Standard Plan',
    '90 swipes + 50,000 UGX Dining Plus',
    90,
    50000,
    315000,
    true,
    2
  ),
  (
    'e0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    'Premium Plan',
    '120 swipes + 100,000 UGX Dining Plus',
    120,
    100000,
    420000,
    true,
    3
  )
ON CONFLICT (id) DO NOTHING;
