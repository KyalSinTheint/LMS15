-- Long videos are split into parts of under 50 MB on upload (the Supabase Free
-- plan limit per file). The parts list is stored with the lesson/resource and
-- played back-to-back. Safe to run more than once.
ALTER TABLE public.license_training_lessons
  ADD COLUMN IF NOT EXISTS video_parts JSONB;

ALTER TABLE public.skill_development_resources
  ADD COLUMN IF NOT EXISTS video_parts JSONB;

NOTIFY pgrst, 'reload schema';
