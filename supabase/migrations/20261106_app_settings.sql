-- ====================================================================
-- LMS settings that administrators change in Admin → Settings.
-- One row ('global'). Everyone may read it (the sign-in page needs it);
-- only administrators may change it. Safe to run more than once.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
    -- Sign-up
    allow_self_registration BOOLEAN NOT NULL DEFAULT true,
    require_admin_approval BOOLEAN NOT NULL DEFAULT true,
    allowed_email_domains TEXT[] NOT NULL DEFAULT '{}',
    -- Password reset
    email_password_reset_enabled BOOLEAN NOT NULL DEFAULT true,
    -- Help desk shown to employees (footer "Contact Us")
    support_email TEXT NOT NULL DEFAULT 'kbzlifelms@gmail.com',
    support_phone TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by_name TEXT
);

INSERT INTO public.app_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read LMS settings" ON public.app_settings;
CREATE POLICY "Anyone can read LMS settings" ON public.app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins update LMS settings" ON public.app_settings;
CREATE POLICY "Admins update LMS settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE (allow_self_registration, require_admin_approval, allowed_email_domains,
              email_password_reset_enabled, support_email, support_phone,
              updated_at, updated_by, updated_by_name)
  ON public.app_settings TO authenticated;

-- --------------------------------------------------------------------
-- New accounts follow the settings.
--
-- Sign-ups from the LMS registration page carry a username in their
-- metadata. For those:
--   * blocked when self-registration is turned off,
--   * blocked when the email domain is not in the allowed list (if set),
--   * 'pending' when admin approval is required, otherwise 'active'.
-- Accounts created any other way (e.g. Supabase dashboard) always start
-- 'pending', so an administrator approves them in User Management.
-- Role is NEVER read from client-supplied metadata.
-- (Requires 20261101_backfill_profiles.sql for create_profile_for_auth_user.)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.app_settings%ROWTYPE;
  from_lms_signup BOOLEAN := COALESCE(NEW.raw_user_meta_data->>'username', '') <> '';
  email_domain TEXT := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
BEGIN
  SELECT * INTO cfg FROM public.app_settings WHERE id = 'global';

  IF from_lms_signup AND cfg.id IS NOT NULL THEN
    IF NOT cfg.allow_self_registration THEN
      RAISE EXCEPTION 'LMS_REGISTRATION_CLOSED: Self-registration is turned off. Please contact the LMS Administrator.';
    END IF;
    IF COALESCE(array_length(cfg.allowed_email_domains, 1), 0) > 0
       AND NOT (email_domain = ANY (cfg.allowed_email_domains)) THEN
      RAISE EXCEPTION 'LMS_EMAIL_DOMAIN_NOT_ALLOWED: Please register with your work email address.';
    END IF;
  END IF;

  -- Creates a 'pending' learner profile with a unique username
  PERFORM public.create_profile_for_auth_user(NEW);

  IF from_lms_signup AND cfg.id IS NOT NULL AND NOT cfg.require_admin_approval THEN
    UPDATE public.profiles SET account_status = 'active' WHERE id = NEW.id AND account_status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
