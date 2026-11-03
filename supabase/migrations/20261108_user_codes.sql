-- ====================================================================
-- Migration: 20261108_user_codes.sql
-- User IDs, Internal / External, and names that cannot be changed.
--
--  * Every profile gets a User ID, numbered from 001 per department:
--      Agency                  Internal AI-001 · External AE-001
--      Bancassurance           Internal BI-001 · External BE-001
--      Corporate Direct Sales  Internal CI-001 · External CE-001
--      Operations OPS-001 · Admin ADM-001 · Human Resources HR-001
--      Learning & Development LD-001 · Finance FIN-001 · IT IT-001
--      Marketing MKT-001 · anything else GEN-001
--    Existing profiles are numbered in the order they were created.
--  * Internal / External is chosen at registration (Agency,
--    Bancassurance and Corporate Direct Sales only).
--  * Employees cannot change their full name, department, User ID or
--    Internal / External; nobody can change a User ID once it is given.
--
-- Safe to re-run. Run in Supabase → SQL Editor.
-- ====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_employment_type_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_employment_type_check CHECK (employment_type IS NULL OR employment_type IN ('internal', 'external'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_code_key ON public.profiles (user_code);

-- Last number used per prefix ("AE" → 12 means AE-012 was the last one)
CREATE TABLE IF NOT EXISTS public.user_code_counters (
    prefix TEXT PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.user_code_counters ENABLE ROW LEVEL SECURITY; -- no policies: only the functions below use it

-- Departments that have Internal and External staff
CREATE OR REPLACE FUNCTION public.department_has_employment_type(p_department TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(COALESCE(p_department, ''))) IN ('agency', 'bancassurance', 'corporate direct sales');
$$;

CREATE OR REPLACE FUNCTION public.user_code_prefix(p_department TEXT, p_employment_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(COALESCE(p_department, '')))
    WHEN 'agency' THEN 'A'
    WHEN 'bancassurance' THEN 'B'
    WHEN 'corporate direct sales' THEN 'C'
    WHEN 'operations' THEN 'OPS'
    WHEN 'admin' THEN 'ADM'
    WHEN 'human resources' THEN 'HR'
    WHEN 'learning & development' THEN 'LD'
    WHEN 'finance' THEN 'FIN'
    WHEN 'it' THEN 'IT'
    WHEN 'marketing' THEN 'MKT'
    ELSE 'GEN'
  END
  || CASE
       WHEN public.department_has_employment_type(p_department)
         THEN CASE WHEN p_employment_type = 'internal' THEN 'I' ELSE 'E' END
       ELSE ''
     END;
$$;

-- Next User ID for a prefix: AE-001, AE-002 … (four digits after 999)
CREATE OR REPLACE FUNCTION public.next_user_code(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  INSERT INTO public.user_code_counters AS c (prefix, last_number)
  VALUES (p_prefix, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_number = c.last_number + 1
  RETURNING last_number INTO n;
  RETURN p_prefix || '-' || CASE WHEN n < 1000 THEN lpad(n::TEXT, 3, '0') ELSE n::TEXT END;
END;
$$;
REVOKE ALL ON FUNCTION public.next_user_code(TEXT) FROM PUBLIC, anon, authenticated;

-- Every new profile gets its User ID (sign-up, admin invite, backfill …)
CREATE OR REPLACE FUNCTION public.assign_user_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.department_has_employment_type(NEW.department) THEN
    NEW.employment_type := NULL;
  END IF;
  IF NEW.user_code IS NULL OR NEW.user_code = '' THEN
    NEW.user_code := public.next_user_code(public.user_code_prefix(NEW.department, NEW.employment_type));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_user_code ON public.profiles;
CREATE TRIGGER trigger_assign_user_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.assign_user_code();

-- Sign-up: also save Internal / External from the registration form
CREATE OR REPLACE FUNCTION public.create_profile_for_auth_user(p_user auth.users)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  emp_type TEXT;
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

  emp_type := lower(NULLIF(p_user.raw_user_meta_data->>'employment_type', ''));
  IF emp_type NOT IN ('internal', 'external') THEN emp_type := NULL; END IF;

  INSERT INTO public.profiles (id, username, full_name, email, role, account_status, department, employee_id, avatar_url, employment_type)
  VALUES (
    p_user.id,
    final_username,
    COALESCE(NULLIF(p_user.raw_user_meta_data->>'full_name', ''), split_part(p_user.email, '@', 1)),
    lower(p_user.email),
    'user',
    'pending',
    COALESCE(NULLIF(p_user.raw_user_meta_data->>'department', ''), 'General Employee'),
    NULLIF(p_user.raw_user_meta_data->>'employee_id', ''),
    NULLIF(p_user.raw_user_meta_data->>'avatar_url', ''),
    emp_type
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

-- Number the existing profiles, oldest first
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, department, employment_type FROM public.profiles WHERE user_code IS NULL ORDER BY created_at, id LOOP
    UPDATE public.profiles
       SET user_code = public.next_user_code(public.user_code_prefix(r.department, r.employment_type))
     WHERE id = r.id;
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- Profiles: same protections as before, plus
--   * employees cannot change their full name or Internal / External
--   * nobody can change a User ID (only the SQL editor can)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / SQL editor / auth triggers have no auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_code IS DISTINCT FROM OLD.user_code THEN
    RAISE EXCEPTION 'A User ID cannot be changed.' USING ERRCODE = '42501';
  END IF;

  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR (NEW.must_change_password IS DISTINCT FROM OLD.must_change_password AND NEW.must_change_password = true) THEN
    RAISE EXCEPTION 'Only administrators can change role, account status, employee ID or email.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.employment_type IS DISTINCT FROM OLD.employment_type
     OR NEW.department IS DISTINCT FROM OLD.department THEN
    RAISE EXCEPTION 'Your name, department and Internal / External cannot be changed (your User ID depends on them). Please contact the LMS Administrator.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.temp_password_expires_at IS DISTINCT FROM OLD.temp_password_expires_at
     AND COALESCE(current_setting('kbz.password_reset', true), '') <> 'on' THEN
    RAISE EXCEPTION 'The temporary password state can only be changed by choosing a new password.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
