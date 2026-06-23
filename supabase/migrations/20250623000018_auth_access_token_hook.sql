-- 018_auth_access_token_hook.sql — custom access token hook (Roadmap S1)
--
-- Injects role + scoped ids into the issued JWT so the app/middleware layer can
-- read them without a DB round-trip. Role is derived ONLY from the trusted
-- public.profiles table — never from user-supplied metadata — so a user cannot
-- self-escalate their role via app_metadata/user_metadata. (Direct profile
-- updates are already blocked from changing `role` by the profiles_update_own
-- WITH CHECK in 016_rls.sql.)

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id              UUID := (event ->> 'user_id')::uuid;
  v_claims               JSONB := COALESCE(event -> 'claims', '{}'::jsonb);
  v_role                 public.user_role;
  v_profile_university   UUID;
  v_student_id           UUID;
  v_student_university   UUID;
  v_restaurant_id        UUID;
  v_restaurant_university UUID;
  v_university_id        UUID;
BEGIN
  SELECT p.role, p.university_id
    INTO v_role, v_profile_university
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  -- Never trust client-supplied role/id claims: strip them before (re)building.
  v_claims := v_claims - 'user_role' - 'student_id' - 'university_id' - 'restaurant_id';

  IF v_role IS NULL THEN
    -- Unprovisioned: authenticated but no profile row yet. Minimal claims only.
    v_claims := jsonb_set(v_claims, '{provisioned}', 'false'::jsonb, true);
    event := jsonb_set(event, '{claims}', v_claims, true);
    RETURN event;
  END IF;

  SELECT s.id, s.university_id
    INTO v_student_id, v_student_university
  FROM public.students s
  WHERE s.user_id = v_user_id;

  SELECT sa.restaurant_id, r.university_id
    INTO v_restaurant_id, v_restaurant_university
  FROM public.staff_accounts sa
  JOIN public.restaurants r ON r.id = sa.restaurant_id
  WHERE sa.user_id = v_user_id AND sa.is_active
  LIMIT 1;

  v_university_id := COALESCE(v_student_university, v_profile_university, v_restaurant_university);

  v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(v_role::text), true);
  v_claims := jsonb_set(v_claims, '{provisioned}', 'true'::jsonb, true);

  IF v_student_id IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{student_id}', to_jsonb(v_student_id::text), true);
  END IF;
  IF v_restaurant_id IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{restaurant_id}', to_jsonb(v_restaurant_id::text), true);
  END IF;
  IF v_university_id IS NOT NULL THEN
    v_claims := jsonb_set(v_claims, '{university_id}', to_jsonb(v_university_id::text), true);
  END IF;

  event := jsonb_set(event, '{claims}', v_claims, true);
  RETURN event;
END;
$$;

-- The hook executes as `supabase_auth_admin` during token issuance.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- RLS is enabled on these tables; allow the auth admin role to read them so the
-- hook can resolve role + ids during token minting.
GRANT SELECT ON public.profiles, public.students, public.staff_accounts, public.restaurants
  TO supabase_auth_admin;

CREATE POLICY auth_admin_read_profiles ON public.profiles
  FOR SELECT TO supabase_auth_admin USING (true);
CREATE POLICY auth_admin_read_students ON public.students
  FOR SELECT TO supabase_auth_admin USING (true);
CREATE POLICY auth_admin_read_staff_accounts ON public.staff_accounts
  FOR SELECT TO supabase_auth_admin USING (true);
CREATE POLICY auth_admin_read_restaurants ON public.restaurants
  FOR SELECT TO supabase_auth_admin USING (true);
