-- 016_rls.sql — row level security (Technical Foundation v2)

-- Enable RLS on all public tables
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_plan_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_rate_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sauces ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_sauce_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE included_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flutterwave_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flutterwave_settlement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_reconciliation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_university_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_restaurant_stats ENABLE ROW LEVEL SECURITY;

-- universities
CREATE POLICY universities_select ON universities FOR SELECT USING (
  is_active = true
  OR current_user_role() = 'admin'
  OR (
    current_user_role() = 'university_admin'
    AND id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY universities_admin ON universities FOR ALL USING (
  current_user_role() = 'admin'
);

-- semesters
CREATE POLICY semesters_select ON semesters FOR SELECT USING (
  university_id = current_university_id()
  OR current_user_role() = 'admin'
  OR (
    current_user_role() = 'university_admin'
    AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY semesters_admin ON semesters FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY semesters_university_admin ON semesters FOR ALL USING (
  current_user_role() = 'university_admin'
  AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
);

-- platform_settings: admin read only
CREATE POLICY platform_settings_admin ON platform_settings FOR SELECT USING (
  current_user_role() = 'admin'
);

-- university_settings
CREATE POLICY university_settings_university_admin ON university_settings FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY university_settings_admin ON university_settings FOR ALL USING (
  current_user_role() = 'admin'
);

-- feature_flags
CREATE POLICY feature_flags_select ON feature_flags FOR SELECT USING (
  enabled = true
  OR current_user_role() IN ('admin', 'university_admin', 'restaurant_staff', 'restaurant_manager')
);
CREATE POLICY feature_flags_admin ON feature_flags FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY feature_flags_university_admin ON feature_flags FOR ALL USING (
  current_user_role() = 'university_admin'
  AND (
    university_id IS NULL
    OR university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- profiles
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (
  user_id = auth.uid()
  OR current_user_role() = 'admin'
);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT role FROM profiles WHERE user_id = auth.uid())
);

-- students
CREATE POLICY students_select_own ON students FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY students_update_own ON students FOR UPDATE USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY students_admin ON students FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY students_university_admin ON students FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
);

-- photo_approvals
CREATE POLICY photo_approvals_admin ON photo_approvals FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY photo_approvals_university_admin ON photo_approvals FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_id
      AND s.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- student_wallets
CREATE POLICY wallets_select_own ON student_wallets FOR SELECT USING (
  student_id = current_student_id()
);
CREATE POLICY wallets_admin ON student_wallets FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY wallets_university_admin ON student_wallets FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_id
      AND s.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- wallet_ledger_entries
CREATE POLICY ledger_select_own ON wallet_ledger_entries FOR SELECT USING (
  student_id = current_student_id()
);
CREATE POLICY ledger_admin ON wallet_ledger_entries FOR SELECT USING (
  current_user_role() = 'admin'
);
CREATE POLICY ledger_university_admin ON wallet_ledger_entries FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_id
      AND s.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- wallet_adjustments: admin only
CREATE POLICY wallet_adjustments_admin ON wallet_adjustments FOR ALL USING (
  current_user_role() = 'admin'
);

-- meal_plans
CREATE POLICY meal_plans_select ON meal_plans FOR SELECT USING (
  (university_id = current_university_id() AND is_active = true)
  OR current_user_role() = 'admin'
  OR (
    current_user_role() = 'university_admin'
    AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY meal_plans_admin ON meal_plans FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY meal_plans_university_admin ON meal_plans FOR ALL USING (
  current_user_role() = 'university_admin'
  AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
);

-- student_plan_purchases
CREATE POLICY plan_purchases_select_own ON student_plan_purchases FOR SELECT USING (
  student_id = current_student_id()
);
CREATE POLICY plan_purchases_admin ON student_plan_purchases FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY plan_purchases_university_admin ON student_plan_purchases FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_id
      AND s.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- restaurant_tiers
CREATE POLICY restaurant_tiers_select ON restaurant_tiers FOR SELECT USING (
  university_id = current_university_id()
  OR current_user_role() = 'admin'
  OR (
    current_user_role() = 'university_admin'
    AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY restaurant_tiers_admin ON restaurant_tiers FOR ALL USING (
  current_user_role() = 'admin'
);

-- restaurants
CREATE POLICY restaurants_select ON restaurants FOR SELECT USING (
  (university_id = current_university_id() AND status = 'active')
  OR id = current_restaurant_id()
  OR current_user_role() = 'admin'
  OR (
    current_user_role() = 'university_admin'
    AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY restaurants_manager ON restaurants FOR UPDATE USING (
  id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);
CREATE POLICY restaurants_admin ON restaurants FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY restaurants_university_admin ON restaurants FOR ALL USING (
  current_user_role() = 'university_admin'
  AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
);

-- restaurant_locations
CREATE POLICY restaurant_locations_select ON restaurant_locations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND (
        (r.university_id = current_university_id() AND r.status = 'active')
        OR r.id = current_restaurant_id()
        OR current_user_role() = 'admin'
      )
  )
);
CREATE POLICY restaurant_locations_manager ON restaurant_locations FOR ALL USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);
CREATE POLICY restaurant_locations_admin ON restaurant_locations FOR ALL USING (
  current_user_role() = 'admin'
);

-- staff_accounts
CREATE POLICY staff_select_own ON staff_accounts FOR SELECT USING (
  user_id = auth.uid()
  OR (
    restaurant_id = current_restaurant_id()
    AND current_user_role() = 'restaurant_manager'
  )
  OR current_user_role() = 'admin'
);
CREATE POLICY staff_manager ON staff_accounts FOR ALL USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);
CREATE POLICY staff_admin ON staff_accounts FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY staff_university_admin ON staff_accounts FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- payout_rate_configs: manager + admin
CREATE POLICY payout_rate_configs_manager ON payout_rate_configs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.id = current_restaurant_id()
      AND current_user_role() = 'restaurant_manager'
  )
  OR current_user_role() = 'admin'
);
CREATE POLICY payout_rate_configs_admin ON payout_rate_configs FOR ALL USING (
  current_user_role() = 'admin'
);

-- restaurant_sauce_pricing: students denied; manager + admin
CREATE POLICY sauce_pricing_manager ON restaurant_sauce_pricing FOR SELECT USING (
  current_user_role() IN ('restaurant_manager', 'admin')
  AND EXISTS (
    SELECT 1 FROM sauces s
    JOIN restaurants r ON r.id = s.restaurant_id
    WHERE s.id = sauce_id
      AND (r.id = current_restaurant_id() OR current_user_role() = 'admin')
  )
);
CREATE POLICY sauce_pricing_manager_write ON restaurant_sauce_pricing FOR ALL USING (
  current_user_role() IN ('restaurant_manager', 'admin')
);
CREATE POLICY sauce_pricing_university_admin ON restaurant_sauce_pricing FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM sauces s
    JOIN restaurants r ON r.id = s.restaurant_id
    WHERE s.id = sauce_id
      AND r.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- sauces, extras, daily_menus, included_foods
CREATE POLICY sauces_select ON sauces FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = current_university_id()
      AND r.status = 'active'
  )
  OR restaurant_id = current_restaurant_id()
  OR current_user_role() = 'admin'
);
CREATE POLICY sauces_manager ON sauces FOR ALL USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);

CREATE POLICY included_foods_select ON included_foods FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = current_university_id()
      AND r.status = 'active'
  )
  OR restaurant_id = current_restaurant_id()
  OR current_user_role() = 'admin'
);
CREATE POLICY included_foods_manager ON included_foods FOR ALL USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() IN ('restaurant_staff', 'restaurant_manager')
);

CREATE POLICY extras_select ON extras FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = current_university_id()
      AND r.status = 'active'
  )
  OR restaurant_id = current_restaurant_id()
  OR current_user_role() = 'admin'
);
CREATE POLICY extras_manager ON extras FOR ALL USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);

CREATE POLICY extra_price_history_deny ON extra_price_history FOR SELECT USING (
  current_user_role() IN ('restaurant_manager', 'admin', 'university_admin')
);

CREATE POLICY daily_menus_select ON daily_menus FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = current_university_id()
  )
  OR restaurant_id = current_restaurant_id()
  OR current_user_role() = 'admin'
);
CREATE POLICY daily_menus_manager ON daily_menus FOR ALL USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() IN ('restaurant_staff', 'restaurant_manager')
);

-- restaurant_applications
CREATE POLICY restaurant_applications_insert ON restaurant_applications FOR INSERT WITH CHECK (true);
CREATE POLICY restaurant_applications_admin ON restaurant_applications FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY restaurant_applications_university_admin ON restaurant_applications FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
);

-- restaurant_payout_accounts: staff manager read own; admin all
CREATE POLICY payout_accounts_manager ON restaurant_payout_accounts FOR SELECT USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);
CREATE POLICY payout_accounts_admin ON restaurant_payout_accounts FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY payout_accounts_university_admin ON restaurant_payout_accounts FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- qr_tokens, validation_sessions: no direct client access
CREATE POLICY qr_tokens_deny_all ON qr_tokens FOR ALL USING (false);
CREATE POLICY qr_tokens_admin ON qr_tokens FOR SELECT USING (
  current_user_role() = 'admin'
);
CREATE POLICY validation_sessions_deny ON validation_sessions FOR ALL USING (false);
CREATE POLICY validation_sessions_admin ON validation_sessions FOR SELECT USING (
  current_user_role() = 'admin'
);

-- transactions
CREATE POLICY transactions_student ON transactions FOR SELECT USING (
  student_id = current_student_id()
);
CREATE POLICY transactions_restaurant ON transactions FOR SELECT USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() IN ('restaurant_staff', 'restaurant_manager')
);
CREATE POLICY transactions_admin ON transactions FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY transactions_university_admin ON transactions FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY transaction_extras_select ON transaction_extras FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_id
      AND (
        t.student_id = current_student_id()
        OR t.restaurant_id = current_restaurant_id()
        OR current_user_role() = 'admin'
      )
  )
);

-- device_sessions
CREATE POLICY device_sessions_own ON device_sessions FOR SELECT USING (
  student_id = current_student_id()
);
CREATE POLICY device_sessions_admin ON device_sessions FOR ALL USING (
  current_user_role() = 'admin'
);

-- payments
CREATE POLICY payments_student ON payments FOR SELECT USING (
  student_id = current_student_id()
);
CREATE POLICY payments_admin ON payments FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY payments_university_admin ON payments FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_id
      AND s.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- payouts
CREATE POLICY payouts_manager ON payouts FOR SELECT USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);
CREATE POLICY payouts_admin ON payouts FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY payouts_university_admin ON payouts FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY payout_line_items_manager ON payout_line_items FOR SELECT USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);
CREATE POLICY payout_line_items_admin ON payout_line_items FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY payout_line_items_university_admin ON payout_line_items FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- reconciliation
CREATE POLICY reconciliation_runs_admin ON reconciliation_runs FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY reconciliation_runs_university_admin ON reconciliation_runs FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND (
    university_id IS NULL
    OR university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY fw_webhook_events_admin ON flutterwave_webhook_events FOR SELECT USING (
  current_user_role() = 'admin'
);

CREATE POLICY fw_settlement_admin ON flutterwave_settlement_lines FOR ALL USING (
  current_user_role() = 'admin'
);

CREATE POLICY wallet_reconciliation_issues_admin ON wallet_reconciliation_issues FOR ALL USING (
  current_user_role() = 'admin'
);

-- fraud_alerts
CREATE POLICY fraud_alerts_admin ON fraud_alerts FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY fraud_alerts_university_admin ON fraud_alerts FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND (
    restaurant_id IS NULL
    OR EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = restaurant_id
        AND r.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
    )
  )
);

-- notifications
CREATE POLICY notifications_own ON notifications FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY notifications_update_own ON notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- audit_events
CREATE POLICY audit_admin_read ON audit_events FOR SELECT USING (
  current_user_role() = 'admin'
);
CREATE POLICY audit_university_admin ON audit_events FOR SELECT USING (
  current_user_role() = 'university_admin'
);

-- refunds
CREATE POLICY refunds_student ON refunds FOR SELECT USING (
  student_id = current_student_id()
);
CREATE POLICY refunds_admin ON refunds FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY refunds_university_admin ON refunds FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_id
      AND s.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- stats
CREATE POLICY daily_university_stats_admin ON daily_university_stats FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY daily_university_stats_university_admin ON daily_university_stats FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY daily_restaurant_stats_manager ON daily_restaurant_stats FOR SELECT USING (
  restaurant_id = current_restaurant_id()
  AND current_user_role() = 'restaurant_manager'
);
CREATE POLICY daily_restaurant_stats_admin ON daily_restaurant_stats FOR ALL USING (
  current_user_role() = 'admin'
);
CREATE POLICY daily_restaurant_stats_university_admin ON daily_restaurant_stats FOR SELECT USING (
  current_user_role() = 'university_admin'
  AND EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_id
      AND r.university_id = (SELECT university_id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Storage RLS
CREATE POLICY student_photos_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'student-photos'
  AND current_user_role() = 'student'
  AND (storage.foldername(name))[1] = current_student_id()::text
);

CREATE POLICY student_photos_read_own ON storage.objects FOR SELECT USING (
  bucket_id = 'student-photos'
  AND (
    (storage.foldername(name))[1] = current_student_id()::text
    OR current_user_role() = 'admin'
  )
);

CREATE POLICY restaurant_assets_public ON storage.objects FOR SELECT USING (
  bucket_id = 'restaurant-assets'
);

CREATE POLICY restaurant_assets_manager ON storage.objects FOR ALL USING (
  bucket_id = 'restaurant-assets'
  AND current_user_role() IN ('restaurant_manager', 'admin')
);
