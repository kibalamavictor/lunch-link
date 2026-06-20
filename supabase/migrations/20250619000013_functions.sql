-- 013_functions.sql — public schema helpers (Technical Foundation v2)

CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- F1: JWT / session helpers
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role FROM profiles p WHERE p.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id FROM students s WHERE s.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_university_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.university_id FROM students s WHERE s.user_id = auth.uid()),
    (SELECT p.university_id FROM profiles p WHERE p.user_id = auth.uid()),
    (SELECT r.university_id FROM staff_accounts sa
     JOIN restaurants r ON r.id = sa.restaurant_id
     WHERE sa.user_id = auth.uid() AND sa.is_active
     LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_restaurant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.restaurant_id FROM staff_accounts sa
  WHERE sa.user_id = auth.uid() AND sa.is_active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_university_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_user_role() IN ('admin', 'university_admin');
$$;

-- F4: Swipe rate resolution (Business Rules §8.3)
CREATE OR REPLACE FUNCTION public.resolve_swipe_rate(
  p_restaurant_id UUID,
  p_semester_id UUID
)
RETURNS TABLE (rate_ugx BIGINT, rate_source TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_university_id UUID;
  v_tier_id UUID;
BEGIN
  SELECT r.university_id, r.tier_id INTO v_university_id, v_tier_id
  FROM restaurants r WHERE r.id = p_restaurant_id;

  RETURN QUERY
  SELECT prc.payout_rate_ugx, 'restaurant_specific'::TEXT
  FROM payout_rate_configs prc
  WHERE prc.restaurant_id = p_restaurant_id AND prc.semester_id = p_semester_id
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT rt.default_payout_rate_ugx, 'tier_default'::TEXT
  FROM restaurant_tiers rt WHERE rt.id = v_tier_id;
  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT us.default_swipe_rate_ugx, 'university_default'::TEXT
  FROM university_settings us WHERE us.university_id = v_university_id;
END;
$$;

-- F2: Idempotent wallet mutation (service_role only — see 017_grants.sql)
CREATE OR REPLACE FUNCTION public.apply_wallet_delta(
  p_student_id UUID,
  p_wallet_type wallet_type,
  p_delta BIGINT,
  p_reason ledger_reason,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_request_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS wallet_ledger_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet student_wallets%ROWTYPE;
  v_balance_after BIGINT;
  v_entry wallet_ledger_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_entry FROM wallet_ledger_entries
  WHERE reference_type = p_reference_type
    AND reference_id = p_reference_id
    AND wallet_type = p_wallet_type;
  IF FOUND THEN
    RETURN v_entry;
  END IF;

  SELECT * INTO v_wallet FROM student_wallets
  WHERE student_id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;

  IF v_wallet.wallet_status != 'active' THEN
    RAISE EXCEPTION 'WALLET_FROZEN';
  END IF;

  CASE p_wallet_type
    WHEN 'swipe' THEN
      IF v_wallet.swipe_balance + p_delta::INT < 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_SWIPES';
      END IF;
      UPDATE student_wallets
        SET swipe_balance = swipe_balance + p_delta::INT,
            version = version + 1,
            updated_at = now()
        WHERE student_id = p_student_id
        RETURNING swipe_balance INTO v_balance_after;

    WHEN 'dining_plus' THEN
      IF v_wallet.dining_plus_balance_ugx + p_delta < 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_DINING_PLUS';
      END IF;
      UPDATE student_wallets
        SET dining_plus_balance_ugx = dining_plus_balance_ugx + p_delta,
            version = version + 1,
            updated_at = now()
        WHERE student_id = p_student_id
        RETURNING dining_plus_balance_ugx INTO v_balance_after;

    WHEN 'dining_cash' THEN
      IF v_wallet.dining_cash_balance_ugx + p_delta < 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_DINING_CASH';
      END IF;
      UPDATE student_wallets
        SET dining_cash_balance_ugx = dining_cash_balance_ugx + p_delta,
            version = version + 1,
            updated_at = now()
        WHERE student_id = p_student_id
        RETURNING dining_cash_balance_ugx INTO v_balance_after;
  END CASE;

  INSERT INTO wallet_ledger_entries (
    student_id, wallet_type, delta, balance_after,
    reason, reference_type, reference_id, request_id, metadata
  ) VALUES (
    p_student_id, p_wallet_type, p_delta, v_balance_after,
    p_reason, p_reference_type, p_reference_id, p_request_id, p_metadata
  )
  ON CONFLICT (reference_type, reference_id, wallet_type) DO NOTHING
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    SELECT * INTO v_entry FROM wallet_ledger_entries
    WHERE reference_type = p_reference_type
      AND reference_id = p_reference_id
      AND wallet_type = p_wallet_type;
  END IF;

  RETURN v_entry;
END;
$$;

-- F3: Redemption eligibility (inside transaction; VOLATILE)
CREATE OR REPLACE FUNCTION public.check_redemption_eligibility(p_student_id UUID)
RETURNS TABLE (eligible BOOLEAN, reason_code TEXT)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student students%ROWTYPE;
  v_wallet student_wallets%ROWTYPE;
  v_today_count INT;
  v_last_redemption TIMESTAMPTZ;
  v_timezone TEXT;
  v_cooldown_hours INT;
  v_daily_limit INT;
  v_day_start TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'STUDENT_NOT_FOUND';
    RETURN;
  END IF;

  SELECT * INTO v_wallet FROM student_wallets WHERE student_id = p_student_id;

  IF v_student.photo_status != 'approved' THEN
    RETURN QUERY SELECT false, 'PHOTO_NOT_APPROVED';
    RETURN;
  END IF;

  IF v_student.account_status != 'active' THEN
    RETURN QUERY SELECT false, 'ACCOUNT_NOT_ACTIVE';
    RETURN;
  END IF;

  IF v_wallet.wallet_status != 'active' THEN
    RETURN QUERY SELECT false, 'WALLET_FROZEN';
    RETURN;
  END IF;

  IF v_wallet.swipe_balance < 1 THEN
    RETURN QUERY SELECT false, 'INSUFFICIENT_SWIPES';
    RETURN;
  END IF;

  SELECT
    COALESCE(us.timezone, ps.default_timezone),
    COALESCE(us.redemption_cooldown_hours, ps.global_redemption_cooldown_hours),
    COALESCE(us.daily_swipe_limit, ps.global_daily_swipe_limit)
  INTO v_timezone, v_cooldown_hours, v_daily_limit
  FROM university_settings us
  CROSS JOIN platform_settings ps
  WHERE us.university_id = v_student.university_id
  LIMIT 1;

  IF v_timezone IS NULL THEN
    SELECT default_timezone, global_redemption_cooldown_hours, global_daily_swipe_limit
    INTO v_timezone, v_cooldown_hours, v_daily_limit
    FROM platform_settings
    LIMIT 1;
  END IF;

  v_day_start := date_trunc(
    'day',
    now() AT TIME ZONE v_timezone
  ) AT TIME ZONE v_timezone;

  SELECT COUNT(*) INTO v_today_count
  FROM transactions
  WHERE student_id = p_student_id
    AND type = 'meal_redemption'
    AND voided_at IS NULL
    AND created_at >= v_day_start;

  IF v_today_count >= v_daily_limit THEN
    RETURN QUERY SELECT false, 'DAILY_LIMIT_EXCEEDED';
    RETURN;
  END IF;

  SELECT MAX(created_at) INTO v_last_redemption
  FROM transactions
  WHERE student_id = p_student_id
    AND type = 'meal_redemption'
    AND voided_at IS NULL;

  IF v_last_redemption IS NOT NULL
     AND v_last_redemption > now() - (v_cooldown_hours || ' hours')::INTERVAL THEN
    RETURN QUERY SELECT false, 'COOLDOWN_ACTIVE';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- F3: Receipt number generator
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN p_prefix || '-' || to_char(now() AT TIME ZONE 'Africa/Kampala', 'YYYYMMDD')
         || '-' || lpad(nextval('receipt_number_seq')::TEXT, 6, '0');
END;
$$;

-- F5: Semester expiry (swipe + dining_plus only; dining_cash untouched)
CREATE OR REPLACE FUNCTION public.expire_semester_balances(p_semester_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_count INT := 0;
BEGIN
  FOR v_wallet IN
    SELECT * FROM student_wallets WHERE semester_id = p_semester_id
  LOOP
    IF v_wallet.swipe_balance > 0 THEN
      PERFORM apply_wallet_delta(
        v_wallet.student_id, 'swipe', -v_wallet.swipe_balance,
        'semester_expiry', 'semester', p_semester_id
      );
    END IF;

    IF v_wallet.dining_plus_balance_ugx > 0 THEN
      PERFORM apply_wallet_delta(
        v_wallet.student_id, 'dining_plus', -v_wallet.dining_plus_balance_ugx,
        'semester_expiry', 'semester', p_semester_id
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
