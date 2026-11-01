-- ====================================================================
-- Admin-approved password reset (works without email)
--
-- 1. An employee asks for a reset on the sign-in page
--    (request_password_reset). Nothing changes yet.
-- 2. An administrator verifies the person (phone / in person) and approves
--    (admin_approve_password_reset). A one-time temporary password, valid
--    24 hours, is returned to the admin ONCE and the user's other sessions
--    are signed out.
-- 3. The employee signs in with the temporary password and must choose a
--    new one immediately (finish_temporary_password_change).
--
-- Knowing someone's email is not enough: only an administrator can issue
-- a temporary password. The email reset link keeps working as a backup.
-- Safe to run more than once.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'expired', 'cancelled')),
    temp_password_hash TEXT,
    expires_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_by_name TEXT,
    resolved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON public.password_reset_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user ON public.password_reset_requests (user_id, created_at DESC);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Only administrators can see requests; all changes go through the functions below.
DROP POLICY IF EXISTS "Admins read password reset requests" ON public.password_reset_requests;
CREATE POLICY "Admins read password reset requests" ON public.password_reset_requests
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Rows are only changed through the functions below, and the temporary
-- password hash is never readable by the app (column-level grant).
REVOKE ALL ON public.password_reset_requests FROM anon, authenticated;
GRANT SELECT (id, user_id, identifier, reason, status, expires_at, resolved_by, resolved_by_name, resolved_at, completed_at, created_at)
  ON public.password_reset_requests TO authenticated;

-- --------------------------------------------------------------------
-- Profiles: non-admins may not change temp_password_expires_at themselves
-- (only the functions below may, via a transaction-local flag).
-- Same rules as before, plus that one.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / SQL editor / auth triggers have no auth.uid()
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
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

  IF NEW.temp_password_expires_at IS DISTINCT FROM OLD.temp_password_expires_at
     AND COALESCE(current_setting('kbz.password_reset', true), '') <> 'on' THEN
    RAISE EXCEPTION 'The temporary password state can only be changed by choosing a new password.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------
-- Temporary passwords that were not replaced within 24 hours stop working.
-- Called before every sign-in and from the functions below.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_stale_temporary_passwords()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  req RECORD;
BEGIN
  FOR req IN
    SELECT r.id, r.user_id, r.temp_password_hash
      FROM public.password_reset_requests r
     WHERE r.status = 'approved' AND r.expires_at < now()
     FOR UPDATE SKIP LOCKED
  LOOP
    -- Still the temporary password? Replace it with an unusable random one.
    UPDATE auth.users
       SET encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
           updated_at = now()
     WHERE id = req.user_id AND encrypted_password = req.temp_password_hash;

    PERFORM set_config('kbz.password_reset', 'on', true);
    UPDATE public.profiles
       SET must_change_password = false, temp_password_expires_at = NULL
     WHERE id = req.user_id;

    UPDATE public.password_reset_requests SET status = 'expired' WHERE id = req.id;
  END LOOP;
END;
$$;

-- --------------------------------------------------------------------
-- 1. Employee: request a reset (by email, employee ID or username).
--    Always returns normally, so it does not reveal which accounts exist.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_password_reset(p_identifier TEXT, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ident TEXT := lower(trim(COALESCE(p_identifier, '')));
  target public.profiles%ROWTYPE;
  pending_id UUID;
BEGIN
  IF ident = '' OR length(ident) > 200 THEN
    RETURN;
  END IF;

  PERFORM public.expire_stale_temporary_passwords();

  SELECT * INTO target
    FROM public.profiles
   WHERE (lower(email) = ident OR lower(employee_id) = ident OR lower(username) = ident)
     AND account_status IN ('active', 'approved')
   LIMIT 1;
  IF target.id IS NULL THEN
    RETURN;
  END IF;

  -- One request per account every 10 minutes
  IF EXISTS (
    SELECT 1 FROM public.password_reset_requests
     WHERE user_id = target.id AND created_at > now() - interval '10 minutes'
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO pending_id
    FROM public.password_reset_requests
   WHERE user_id = target.id AND status = 'pending'
   LIMIT 1;

  IF pending_id IS NOT NULL THEN
    UPDATE public.password_reset_requests
       SET created_at = now(), reason = left(NULLIF(trim(p_reason), ''), 500), identifier = left(trim(p_identifier), 200)
     WHERE id = pending_id;
  ELSE
    INSERT INTO public.password_reset_requests (user_id, identifier, reason)
    VALUES (target.id, left(trim(p_identifier), 200), left(NULLIF(trim(p_reason), ''), 500));
  END IF;
END;
$$;

-- --------------------------------------------------------------------
-- 2a. Admin: approve → returns the temporary password (shown once).
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_password_reset(p_request_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  admin_profile public.profiles%ROWTYPE;
  req public.password_reset_requests%ROWTYPE;
  target public.profiles%ROWTYPE;
  alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  raw BYTEA := extensions.gen_random_bytes(8);
  code TEXT := '';
  temp_password TEXT;
  temp_hash TEXT;
  i INT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can approve password resets.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO admin_profile FROM public.profiles WHERE id = auth.uid();

  SELECT * INTO req FROM public.password_reset_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL OR req.status <> 'pending' THEN
    RAISE EXCEPTION 'This request is no longer pending.';
  END IF;

  SELECT * INTO target FROM public.profiles WHERE id = req.user_id;

  FOR i IN 0..7 LOOP
    code := code || substr(alphabet, (get_byte(raw, i) % length(alphabet)) + 1, 1);
  END LOOP;
  temp_password := 'KBZ-' || substr(code, 1, 4) || '-' || substr(code, 5, 4);
  temp_hash := extensions.crypt(temp_password, extensions.gen_salt('bf'));

  UPDATE auth.users SET encrypted_password = temp_hash, updated_at = now() WHERE id = req.user_id;

  -- Sign the account out everywhere (in case someone else was using it)
  BEGIN
    DELETE FROM auth.sessions WHERE user_id = req.user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM set_config('kbz.password_reset', 'on', true);
  UPDATE public.profiles
     SET must_change_password = true, temp_password_expires_at = now() + interval '24 hours'
   WHERE id = req.user_id;

  UPDATE public.password_reset_requests
     SET status = 'approved',
         temp_password_hash = temp_hash,
         expires_at = now() + interval '24 hours',
         resolved_by = auth.uid(),
         resolved_by_name = admin_profile.full_name,
         resolved_at = now()
   WHERE id = req.id;

  -- Older approvals for the same person no longer apply
  UPDATE public.password_reset_requests
     SET status = 'cancelled'
   WHERE user_id = req.user_id AND id <> req.id AND status IN ('pending', 'approved');

  INSERT INTO public.admin_audit_logs (admin_user_id, admin_name, target_user_id, target_user_name, action, entity_type, entity_id, details)
  VALUES (auth.uid(), admin_profile.full_name, target.id, target.full_name, 'password_reset_triggered', 'user', target.id,
          'Approved a password reset request and issued a temporary password (valid 24 hours).');

  RETURN temp_password;
END;
$$;

-- --------------------------------------------------------------------
-- 2b. Admin: reject (nothing changes for the account).
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reject_password_reset(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_profile public.profiles%ROWTYPE;
  req public.password_reset_requests%ROWTYPE;
  target public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can reject password resets.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO admin_profile FROM public.profiles WHERE id = auth.uid();

  SELECT * INTO req FROM public.password_reset_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL OR req.status <> 'pending' THEN
    RAISE EXCEPTION 'This request is no longer pending.';
  END IF;
  SELECT * INTO target FROM public.profiles WHERE id = req.user_id;

  UPDATE public.password_reset_requests
     SET status = 'rejected', resolved_by = auth.uid(), resolved_by_name = admin_profile.full_name, resolved_at = now()
   WHERE id = req.id;

  INSERT INTO public.admin_audit_logs (admin_user_id, admin_name, target_user_id, target_user_name, action, entity_type, entity_id, details)
  VALUES (auth.uid(), admin_profile.full_name, target.id, target.full_name, 'password_reset_triggered', 'user', target.id,
          'Rejected a password reset request.');
END;
$$;

-- --------------------------------------------------------------------
-- 3. Employee: after choosing a new password, leave temporary-password mode.
--    Refuses while the account still uses the temporary password.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finish_temporary_password_change()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  req public.password_reset_requests%ROWTYPE;
  current_hash TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO req
    FROM public.password_reset_requests
   WHERE user_id = uid AND status = 'approved'
   ORDER BY resolved_at DESC
   LIMIT 1
   FOR UPDATE;

  IF req.id IS NOT NULL THEN
    SELECT encrypted_password INTO current_hash FROM auth.users WHERE id = uid;
    IF current_hash = req.temp_password_hash THEN
      RAISE EXCEPTION 'Please choose a new password first.';
    END IF;
    UPDATE public.password_reset_requests SET status = 'completed', completed_at = now() WHERE id = req.id;
  END IF;

  PERFORM set_config('kbz.password_reset', 'on', true);
  UPDATE public.profiles
     SET must_change_password = false, temp_password_expires_at = NULL
   WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_temporary_passwords() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_password_reset(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_approve_password_reset(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_password_reset(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finish_temporary_password_change() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.expire_stale_temporary_passwords() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_password_reset(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_password_reset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_password_reset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_temporary_password_change() TO authenticated;

NOTIFY pgrst, 'reload schema';
