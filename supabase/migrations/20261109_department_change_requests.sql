-- ====================================================================
-- Migration: 20261109_department_change_requests.sql
-- Employees cannot change their department themselves: they send a
-- request, admins see it (Admin → Dept Changes, with a count badge) and
-- approve or reject it. On approval the department (and Internal /
-- External) is updated and a new User ID for the new department is given
-- (e.g. AE-004 → HR-012); the old ID is kept on the request.
--
-- Requires 20261108_user_codes.sql. Safe to re-run.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.department_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    from_department TEXT,
    from_employment_type TEXT,
    from_user_code TEXT,
    to_department TEXT NOT NULL,
    to_employment_type TEXT CHECK (to_employment_type IS NULL OR to_employment_type IN ('internal', 'external')),
    to_user_code TEXT,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    admin_note TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_by_name TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dept_change_status ON public.department_change_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dept_change_user ON public.department_change_requests (user_id, created_at DESC);

ALTER TABLE public.department_change_requests ENABLE ROW LEVEL SECURITY;

-- Employees see their own requests, admins see all; changes only through the functions below
DROP POLICY IF EXISTS "Read department change requests" ON public.department_change_requests;
CREATE POLICY "Read department change requests" ON public.department_change_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.department_change_requests FROM anon, authenticated;
GRANT SELECT ON public.department_change_requests TO authenticated;

-- --------------------------------------------------------------------
-- Employee: ask to move to another department (replaces an open request)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_department_change(
  p_department TEXT,
  p_employment_type TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me public.profiles%ROWTYPE;
  emp TEXT := lower(NULLIF(trim(COALESCE(p_employment_type, '')), ''));
  new_id UUID;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = auth.uid();
  IF me.id IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(trim(COALESCE(p_department, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Please choose a department.';
  END IF;
  IF public.department_has_employment_type(p_department) THEN
    IF emp IS NULL OR emp NOT IN ('internal', 'external') THEN
      RAISE EXCEPTION 'Please choose Internal or External.';
    END IF;
  ELSE
    emp := NULL;
  END IF;
  IF trim(p_department) = COALESCE(me.department, '') AND emp IS NOT DISTINCT FROM me.employment_type THEN
    RAISE EXCEPTION 'That is already your department.';
  END IF;

  UPDATE public.department_change_requests
     SET status = 'cancelled', resolved_at = now()
   WHERE user_id = me.id AND status = 'pending';

  INSERT INTO public.department_change_requests
    (user_id, user_name, from_department, from_employment_type, from_user_code, to_department, to_employment_type, reason)
  VALUES
    (me.id, me.full_name, me.department, me.employment_type, me.user_code, trim(p_department), emp, NULLIF(trim(COALESCE(p_reason, '')), ''))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_department_change(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_department_change(TEXT, TEXT, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- Admin: approve (moves the employee, new User ID) or reject
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_resolve_department_change(
  p_request_id UUID,
  p_approve BOOLEAN,
  p_note TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_profile public.profiles%ROWTYPE;
  req public.department_change_requests%ROWTYPE;
  new_code TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Administrator access required.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO admin_profile FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO req FROM public.department_change_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL OR req.status <> 'pending' THEN
    RAISE EXCEPTION 'This request is no longer open.';
  END IF;

  IF p_approve THEN
    new_code := public.next_user_code(public.user_code_prefix(req.to_department, req.to_employment_type));
    PERFORM set_config('kbz.user_code_change', 'on', true);
    UPDATE public.profiles
       SET department = req.to_department,
           employment_type = req.to_employment_type,
           user_code = new_code,
           updated_at = now()
     WHERE id = req.user_id;
    PERFORM set_config('kbz.user_code_change', 'off', true);
  END IF;

  UPDATE public.department_change_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         to_user_code = new_code,
         admin_note = NULLIF(trim(COALESCE(p_note, '')), ''),
         resolved_by = admin_profile.id,
         resolved_by_name = admin_profile.full_name,
         resolved_at = now()
   WHERE id = req.id;
  RETURN new_code;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_resolve_department_change(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_department_change(UUID, BOOLEAN, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- Profiles: a User ID changes only through an approved department change
-- (everything else as in 20261108_user_codes.sql)
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

  IF NEW.user_code IS DISTINCT FROM OLD.user_code
     AND COALESCE(current_setting('kbz.user_code_change', true), '') <> 'on' THEN
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
    RAISE EXCEPTION 'Your name, department and Internal / External cannot be changed here. Please send a department change request to the LMS Administrator.'
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
