-- 017_grants.sql — restrict sensitive function execution

REVOKE ALL ON FUNCTION public.apply_wallet_delta(
  UUID, wallet_type, BIGINT, ledger_reason, TEXT, UUID, UUID, JSONB
) FROM PUBLIC, authenticated, anon;

REVOKE ALL ON FUNCTION public.expire_semester_balances(UUID)
  FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.apply_wallet_delta(
  UUID, wallet_type, BIGINT, ledger_reason, TEXT, UUID, UUID, JSONB
) TO service_role;

GRANT EXECUTE ON FUNCTION public.expire_semester_balances(UUID)
  TO service_role;

-- Read helpers are safe for authenticated JWT context
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_student_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_university_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_restaurant_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_university_admin() TO authenticated, anon;

REVOKE ALL ON FUNCTION public.resolve_swipe_rate(UUID, UUID)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.resolve_swipe_rate(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.check_redemption_eligibility(UUID)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_redemption_eligibility(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.generate_receipt_number(TEXT)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_receipt_number(TEXT) TO service_role;
