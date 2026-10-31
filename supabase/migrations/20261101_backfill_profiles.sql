-- ====================================================================
-- Migration: 20261101_backfill_profiles.sql
-- Fixes "No profile exists for this account" for auth users that were
-- created before the on_auth_user_created trigger existed (e.g. users
-- added in Supabase -> Authentication before running the setup SQL).
--
--  1. Backfills a profile for every auth user that has none.
--  2. Adds ensure_my_profile(): the app calls it when a signed-in user
--     has no profile, so this can never lock someone out again.
--
-- Safe to re-run.
-- ====================================================================

-- Usernames must be unique: derive from metadata or the email prefix and
-- add a short suffix only when that name is already taken.
CREATE OR REPLACE FUNCTION public.create_profile_for_auth_user(p_user auth.users)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  prof public.profiles;
BEGIN
  SELECT * INTO prof FROM public.profiles WHERE id = p_user.id;
  IF prof.id IS NOT NULL THEN
    RETURN prof;
  END IF;

  base_username := lower(regexp_replace(
    COALESCE(NULLIF(p_user.raw_user_meta_data->>'username', ''), split_part(p_user.email, '@', 1), 'user'),
    '[^a-zA-Z0-9._-]', '', 'g'));
  IF base_username = '' THEN base_username := 'user'; END IF;
  final_username := base_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = final_username) THEN
    final_username := base_username || '_' || substr(replace(p_user.id::text, '-', ''), 1, 6);
  END IF;

  INSERT INTO public.profiles (id, username, full_name, email, role, account_status, department, employee_id, avatar_url)
  VALUES (
    p_user.id,
    final_username,
    COALESCE(NULLIF(p_user.raw_user_meta_data->>'full_name', ''), split_part(p_user.email, '@', 1)),
    lower(p_user.email),
    'user',
    'pending',
    COALESCE(NULLIF(p_user.raw_user_meta_data->>'department', ''), 'General Employee'),
    NULLIF(p_user.raw_user_meta_data->>'employee_id', ''),
    NULLIF(p_user.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING * INTO prof;

  IF prof.id IS NULL THEN
    SELECT * INTO prof FROM public.profiles WHERE id = p_user.id;
  END IF;
  RETURN prof;
END;
$$;

REVOKE ALL ON FUNCTION public.create_profile_for_auth_user(auth.users) FROM PUBLIC, anon, authenticated;

-- The sign-up trigger now uses the same unique-username logic, so a
-- duplicate username can no longer make sign-up fail.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_profile_for_auth_user(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- Called by the app for the signed-in user when their profile is missing.
-- New profiles are always pending learners; promotion stays an admin action.
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u auth.users;
BEGIN
  SELECT * INTO u FROM auth.users WHERE id = auth.uid();
  IF u.id IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  RETURN public.create_profile_for_auth_user(u);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- Backfill every existing auth user without a profile
DO $$
DECLARE
  u auth.users;
BEGIN
  FOR u IN SELECT * FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id) LOOP
    PERFORM public.create_profile_for_auth_user(u);
  END LOOP;
END $$;
