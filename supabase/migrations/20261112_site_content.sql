-- ====================================================================
-- Migration: 20261112_site_content.sql
-- Page content admins can change from the admin panel, starting with the
-- CEO section of the Our Company page (photo, name, title).
-- Everyone can read it; only admins can change it. Safe to re-run.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.site_content (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by_name TEXT
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;
CREATE POLICY "Anyone can read site content" ON public.site_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage site content" ON public.site_content;
CREATE POLICY "Admins manage site content" ON public.site_content
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
