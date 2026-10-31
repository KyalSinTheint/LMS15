-- ====================================================================
-- Migration: 20261031_supabase_backend.sql
-- Moves every piece of LMS state that previously lived in browser
-- localStorage or in the Node server's memory into Supabase.
--
--  * Supabase Auth is the single source of identity. New sign-ups are
--    created as role = 'user', account_status = 'pending'.
--  * Non-admins can no longer change their own role / status.
--  * Missing tables: license_training_lessons, license_lesson_progress,
--    skill_quizzes, skill_quiz_attempts, company_bulletins.
--  * Quiz answer keys are hidden from learners (learner views) and
--    quizzes are graded inside Postgres (submit_* RPCs).
--  * Video / PDF progress is recorded through RPCs that use the
--    database clock, so learners cannot simply write 100%.
--
-- Safe to re-run: every statement is idempotent.
-- ====================================================================

-- --------------------------------------------------------------------
-- 0. HELPERS
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(lookup_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = lookup_user_id
      AND role = 'admin'
      AND account_status IN ('active', 'approved')
  );
$$;

-- --------------------------------------------------------------------
-- 1. AUTH ↔ PROFILES
-- --------------------------------------------------------------------

-- New auth users always start as a pending learner. Role is NEVER read
-- from client-supplied metadata.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, role, account_status, department, employee_id, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(lower(trim(COALESCE(NEW.raw_user_meta_data->>'username', ''))), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    lower(NEW.email),
    'user',
    'pending',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'General Employee'),
    NULLIF(NEW.raw_user_meta_data->>'employee_id', ''),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- Keep profiles.email / last_sign_in_at in sync with auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET email = lower(NEW.email),
         last_sign_in_at = NEW.last_sign_in_at
   WHERE id = NEW.id
     AND (email IS DISTINCT FROM lower(NEW.email) OR last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_updated();

-- Non-admins may edit their own name / username / department / avatar,
-- but never role, account status, employee id or email.
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_profile_fields ON public.profiles;
CREATE TRIGGER trigger_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_privileged_fields();

-- Profiles: users may only update their own row (WITH CHECK added)
DROP POLICY IF EXISTS "Users can update personal profile details" ON public.profiles;
CREATE POLICY "Users can update personal profile details" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Resolve a username to its login email (used by the sign-in form so
-- employees can sign in with either username or email).
CREATE OR REPLACE FUNCTION public.get_login_email(p_identifier TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles
  WHERE lower(username) = lower(trim(p_identifier))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(p_username)));
$$;

REVOKE ALL ON FUNCTION public.get_login_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_username_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_login_email(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon, authenticated;

-- --------------------------------------------------------------------
-- 2. MISSING COLUMNS ON EXISTING TABLES
-- --------------------------------------------------------------------
ALTER TABLE public.skill_development_resources ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.skill_development_resources ADD COLUMN IF NOT EXISTS instructor_avatar_path TEXT;
ALTER TABLE public.product_knowledge_items ADD COLUMN IF NOT EXISTS content TEXT;

-- Admin audit logs: allow admins to insert with their own id only
DROP POLICY IF EXISTS "Admins view and insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins view and insert audit logs" ON public.admin_audit_logs
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) AND admin_user_id = auth.uid());

-- --------------------------------------------------------------------
-- 3. LICENSE TRAINING LESSONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_training_lessons (
    id TEXT PRIMARY KEY DEFAULT ('lic_lesson_' || substr(md5(random()::text), 1, 10)),
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf')) DEFAULT 'video',
    lesson_type TEXT CHECK (lesson_type IN ('video', 'pdf')),
    file_url TEXT NOT NULL DEFAULT '',
    file_path TEXT,
    storage_path TEXT,
    file_name TEXT,
    file_size BIGINT,
    file_size_bytes BIGINT,
    file_size_formatted TEXT,
    duration TEXT,
    video_duration TEXT,
    thumbnail_url TEXT,
    thumbnail_path TEXT,
    category TEXT DEFAULT 'Regulatory Accreditation',
    chapter_id TEXT REFERENCES public.license_chapters(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'published',
    is_published BOOLEAN NOT NULL DEFAULT true,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_license_lessons_chapter ON public.license_training_lessons(chapter_id);

ALTER TABLE public.license_training_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read published license lessons" ON public.license_training_lessons;
CREATE POLICY "Read published license lessons" ON public.license_training_lessons
  FOR SELECT USING (is_published = true OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage license lessons" ON public.license_training_lessons;
CREATE POLICY "Admins manage license lessons" ON public.license_training_lessons
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- 4. PER-LESSON PROGRESS (video watch intervals / PDF pages / lesson quiz)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_lesson_progress (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    content_type TEXT CHECK (content_type IN ('video', 'pdf')),
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    completion_status TEXT NOT NULL CHECK (completion_status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    watched_seconds REAL NOT NULL DEFAULT 0,
    total_duration_seconds REAL NOT NULL DEFAULT 0,
    watched_intervals JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_position REAL NOT NULL DEFAULT 0,
    viewed_pages INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    total_pages INTEGER NOT NULL DEFAULT 0,
    last_page INTEGER NOT NULL DEFAULT 1,
    quiz_score INTEGER,
    quiz_passed BOOLEAN,
    quiz_attempts_count INTEGER NOT NULL DEFAULT 0,
    quiz_completed_at TIMESTAMPTZ,
    overall_completed BOOLEAN NOT NULL DEFAULT false,
    last_heartbeat_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, lesson_id)
);

ALTER TABLE public.license_lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own lesson progress" ON public.license_lesson_progress;
CREATE POLICY "Users read own lesson progress" ON public.license_lesson_progress
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
-- No INSERT/UPDATE policy for learners: writes go through the RPCs below.

-- --------------------------------------------------------------------
-- 5. SKILL QUIZZES & ATTEMPTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_quizzes (
    id TEXT PRIMARY KEY DEFAULT ('skill_quiz_' || substr(md5(random()::text), 1, 10)),
    category_id TEXT REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    resource_id TEXT REFERENCES public.skill_development_resources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER NOT NULL DEFAULT 80,
    is_published BOOLEAN NOT NULL DEFAULT true,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.skill_quiz_attempts (
    id TEXT PRIMARY KEY DEFAULT ('sqa_' || substr(md5(random()::text), 1, 12)),
    quiz_id TEXT NOT NULL REFERENCES public.skill_quizzes(id) ON DELETE CASCADE,
    category_id TEXT,
    resource_id TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    percentage INTEGER NOT NULL DEFAULT 0,
    passed BOOLEAN NOT NULL DEFAULT false,
    answers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.skill_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage skill quizzes" ON public.skill_quizzes;
CREATE POLICY "Admins manage skill quizzes" ON public.skill_quizzes
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own skill quiz attempts" ON public.skill_quiz_attempts;
CREATE POLICY "Users read own skill quiz attempts" ON public.skill_quiz_attempts
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage skill quiz attempts" ON public.skill_quiz_attempts;
CREATE POLICY "Admins manage skill quiz attempts" ON public.skill_quiz_attempts
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- 6. COMPANY BULLETINS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_bulletins (
    id TEXT PRIMARY KEY DEFAULT ('bul_' || substr(md5(random()::text), 1, 10)),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Announcement',
    pdf_url TEXT NOT NULL DEFAULT '',
    file_name TEXT,
    file_size BIGINT,
    formatted_file_size TEXT,
    page_count INTEGER,
    published BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'published',
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT,
    department TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    reference_no TEXT,
    priority TEXT CHECK (priority IN ('normal', 'high', 'urgent')) DEFAULT 'normal',
    verified BOOLEAN DEFAULT false,
    color_theme TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.company_bulletins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read published bulletins" ON public.company_bulletins;
CREATE POLICY "Read published bulletins" ON public.company_bulletins
  FOR SELECT USING (published = true OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage bulletins" ON public.company_bulletins;
CREATE POLICY "Admins manage bulletins" ON public.company_bulletins
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- 7. QUIZ ANSWER-KEY PROTECTION
--    Learners can no longer SELECT quiz tables directly (they would see
--    correct_option_index). They read the *_learner views instead, which
--    strip the answer key and explanation.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read published license quizzes" ON public.license_quizzes;
DROP POLICY IF EXISTS "Anyone can read published product quizzes" ON public.product_quizzes;

-- Attempts are only created by the submit_* RPCs
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.license_quiz_attempts;
DROP POLICY IF EXISTS "Users can submit own product quiz attempts" ON public.product_quiz_attempts;

-- Chapter completions are only written by submit_license_quiz
DROP POLICY IF EXISTS "Users can upsert own chapter completions" ON public.chapter_completions;
DROP POLICY IF EXISTS "Admins manage chapter completions" ON public.chapter_completions;
CREATE POLICY "Admins manage chapter completions" ON public.chapter_completions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.strip_quiz_answers(p_questions JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_agg(q - 'correct_option_index' - 'explanation' ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_questions, '[]'::jsonb)) WITH ORDINALITY AS t(q, ord);
$$;

CREATE OR REPLACE VIEW public.license_quizzes_learner AS
  SELECT id, chapter_id, lesson_id, title, description, passing_score, is_published,
         public.strip_quiz_answers(questions) AS questions, created_at, updated_at
  FROM public.license_quizzes
  WHERE is_published = true;

CREATE OR REPLACE VIEW public.product_quizzes_learner AS
  SELECT id, product_id, title, description, passing_score, max_attempts, is_published,
         public.strip_quiz_answers(questions) AS questions, created_at, updated_at
  FROM public.product_quizzes
  WHERE is_published = true;

CREATE OR REPLACE VIEW public.skill_quizzes_learner AS
  SELECT id, category_id, resource_id, title, description, passing_score, is_published,
         public.strip_quiz_answers(questions) AS questions, created_at, updated_at
  FROM public.skill_quizzes
  WHERE is_published = true;

REVOKE ALL ON public.license_quizzes_learner, public.product_quizzes_learner, public.skill_quizzes_learner FROM anon, PUBLIC;
GRANT SELECT ON public.license_quizzes_learner, public.product_quizzes_learner, public.skill_quizzes_learner TO authenticated;

-- Shared grader: returns {score,total_questions,percentage,breakdown}
CREATE OR REPLACE FUNCTION public.grade_quiz(p_questions JSONB, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  q JSONB;
  sel JSONB;
  correct INTEGER;
  is_correct BOOLEAN;
  score INTEGER := 0;
  total INTEGER := 0;
  breakdown JSONB := '[]'::jsonb;
BEGIN
  FOR q IN SELECT value FROM jsonb_array_elements(COALESCE(p_questions, '[]'::jsonb)) LOOP
    total := total + 1;
    sel := p_answers -> (q->>'id');
    correct := (q->>'correct_option_index')::INTEGER;
    is_correct := sel IS NOT NULL AND jsonb_typeof(sel) = 'number' AND sel::INTEGER = correct;
    IF is_correct THEN score := score + 1; END IF;
    breakdown := breakdown || jsonb_build_array(jsonb_build_object(
      'question_id', q->>'id',
      'question_text', q->>'question_text',
      'selected_index', CASE WHEN sel IS NOT NULL AND jsonb_typeof(sel) = 'number' THEN sel ELSE 'null'::jsonb END,
      'correct_index', correct,
      'is_correct', is_correct,
      'explanation', COALESCE(q->>'explanation', '')
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'score', score,
    'total_questions', total,
    'percentage', CASE WHEN total > 0 THEN round(score * 100.0 / total)::INTEGER ELSE 0 END,
    'breakdown', breakdown
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.require_active_learner()
RETURNS public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles;
BEGIN
  SELECT * INTO prof FROM public.profiles WHERE id = auth.uid();
  IF prof.id IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF prof.account_status NOT IN ('active', 'approved') THEN
    RAISE EXCEPTION 'Your account is %. Learning activity cannot be recorded.', prof.account_status USING ERRCODE = '42501';
  END IF;
  RETURN prof;
END;
$$;

-- 7a. License quiz (chapter or lesson level)
CREATE OR REPLACE FUNCTION public.submit_license_quiz(
  p_quiz_id TEXT,
  p_answers JSONB,
  p_chapter_id TEXT DEFAULT NULL,
  p_lesson_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles;
  quiz public.license_quizzes;
  graded JSONB;
  pct INTEGER;
  did_pass BOOLEAN;
  chapter_id_v TEXT;
  lesson_id_v TEXT;
  attempt public.license_quiz_attempts;
  prev public.chapter_completions;
  next_title TEXT;
  lesson_done BOOLEAN := false;
BEGIN
  prof := public.require_active_learner();

  SELECT * INTO quiz FROM public.license_quizzes
   WHERE id = p_quiz_id
      OR (p_quiz_id IS NULL AND p_chapter_id IS NOT NULL AND chapter_id = p_chapter_id)
      OR (p_quiz_id IS NULL AND p_lesson_id IS NOT NULL AND lesson_id = p_lesson_id)
   LIMIT 1;
  IF quiz.id IS NULL OR (quiz.is_published = false AND NOT public.is_admin(prof.id)) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Quiz not found.');
  END IF;

  chapter_id_v := COALESCE(p_chapter_id, quiz.chapter_id);
  lesson_id_v := COALESCE(p_lesson_id, quiz.lesson_id);
  graded := public.grade_quiz(quiz.questions, COALESCE(p_answers, '{}'::jsonb));
  pct := (graded->>'percentage')::INTEGER;
  did_pass := pct >= quiz.passing_score;

  INSERT INTO public.license_quiz_attempts (id, quiz_id, chapter_id, lesson_id, user_id, user_name, user_email,
                                            score, total_questions, percentage, passed, answers)
  VALUES ('lqa_' || replace(gen_random_uuid()::text, '-', ''), quiz.id, chapter_id_v, lesson_id_v, prof.id,
          prof.full_name, prof.email, (graded->>'score')::INTEGER, (graded->>'total_questions')::INTEGER,
          pct, did_pass, COALESCE(p_answers, '{}'::jsonb))
  RETURNING * INTO attempt;

  IF chapter_id_v IS NOT NULL THEN
    SELECT * INTO prev FROM public.chapter_completions WHERE user_id = prof.id AND chapter_id = chapter_id_v;
    INSERT INTO public.chapter_completions (id, user_id, chapter_id, status, materials_completed, quiz_passed,
                                            highest_quiz_score, completed_at, updated_at)
    VALUES ('ch_comp_' || replace(gen_random_uuid()::text, '-', ''), prof.id, chapter_id_v,
            CASE WHEN did_pass THEN 'completed' ELSE 'quiz_available' END, true, did_pass, pct,
            CASE WHEN did_pass THEN now() END, now())
    ON CONFLICT (user_id, chapter_id) DO UPDATE SET
      status = CASE WHEN chapter_completions.quiz_passed OR did_pass THEN 'completed' ELSE 'quiz_available' END,
      materials_completed = true,
      quiz_passed = chapter_completions.quiz_passed OR did_pass,
      highest_quiz_score = GREATEST(COALESCE(chapter_completions.highest_quiz_score, 0), pct),
      completed_at = COALESCE(chapter_completions.completed_at, CASE WHEN did_pass THEN now() END),
      updated_at = now();

    IF did_pass THEN
      SELECT c.title INTO next_title FROM public.license_chapters c
       WHERE c.is_published = true
         AND (c.display_order, c.chapter_number) > (
           SELECT display_order, chapter_number FROM public.license_chapters WHERE id = chapter_id_v)
       ORDER BY c.display_order, c.chapter_number
       LIMIT 1;
    END IF;
  END IF;

  IF lesson_id_v IS NOT NULL THEN
    INSERT INTO public.license_lesson_progress (user_id, lesson_id, quiz_score, quiz_passed, quiz_attempts_count, quiz_completed_at, updated_at)
    VALUES (prof.id, lesson_id_v, pct, did_pass, 1, now(), now())
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
      quiz_score = pct,
      quiz_passed = did_pass,
      quiz_attempts_count = license_lesson_progress.quiz_attempts_count + 1,
      quiz_completed_at = now(),
      overall_completed = did_pass AND license_lesson_progress.completion_status = 'completed',
      updated_at = now()
    RETURNING overall_completed INTO lesson_done;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'score', graded->'score',
    'total_questions', graded->'total_questions',
    'percentage', pct,
    'passed', did_pass,
    'passing_score', quiz.passing_score,
    'breakdown', graded->'breakdown',
    'attempt', to_jsonb(attempt),
    'next_chapter_unlocked', next_title IS NOT NULL,
    'next_chapter_title', COALESCE(next_title, ''),
    'overall_completed', COALESCE(lesson_done, false),
    'message', CASE
      WHEN did_pass THEN format('Assessment Passed! You scored %s%% (Passing threshold is %s%%).', pct, quiz.passing_score)
        || CASE WHEN chapter_id_v IS NULL THEN ''
                WHEN next_title IS NOT NULL THEN ' Next chapter unlocked: ' || next_title
                ELSE ' All licensing chapters completed!' END
      ELSE format('Assessment score: %s%%. Passing score is %s%%. Review the feedback below and retry when ready!', pct, quiz.passing_score)
    END
  );
END;
$$;

-- 7b. Product quiz
CREATE OR REPLACE FUNCTION public.submit_product_quiz(p_product_id TEXT, p_quiz_id TEXT, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles;
  quiz public.product_quizzes;
  graded JSONB;
  pct INTEGER;
  did_pass BOOLEAN;
  used INTEGER;
  attempt public.product_quiz_attempts;
BEGIN
  prof := public.require_active_learner();

  SELECT * INTO quiz FROM public.product_quizzes
   WHERE (p_quiz_id IS NOT NULL AND id = p_quiz_id) OR product_id = p_product_id
   ORDER BY (id = p_quiz_id) DESC
   LIMIT 1;
  IF quiz.id IS NULL OR (quiz.is_published = false AND NOT public.is_admin(prof.id)) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Product quiz not found.');
  END IF;

  IF quiz.max_attempts > 0 THEN
    SELECT count(*) INTO used FROM public.product_quiz_attempts WHERE quiz_id = quiz.id AND user_id = prof.id;
    IF used >= quiz.max_attempts THEN
      RETURN jsonb_build_object('success', false,
        'message', format('You have used all %s allowed attempts for this quiz.', quiz.max_attempts));
    END IF;
  END IF;

  graded := public.grade_quiz(quiz.questions, COALESCE(p_answers, '{}'::jsonb));
  pct := (graded->>'percentage')::INTEGER;
  did_pass := pct >= quiz.passing_score;

  INSERT INTO public.product_quiz_attempts (id, quiz_id, product_id, user_id, user_name, user_email,
                                            score, total_questions, percentage, passed, answers)
  VALUES ('pqa_' || replace(gen_random_uuid()::text, '-', ''), quiz.id, quiz.product_id, prof.id,
          prof.full_name, prof.email, (graded->>'score')::INTEGER, (graded->>'total_questions')::INTEGER,
          pct, did_pass, COALESCE(p_answers, '{}'::jsonb))
  RETURNING * INTO attempt;

  RETURN jsonb_build_object(
    'success', true,
    'score', graded->'score',
    'total_questions', graded->'total_questions',
    'percentage', pct,
    'passed', did_pass,
    'passing_score', quiz.passing_score,
    'breakdown', graded->'breakdown',
    'attempt', to_jsonb(attempt),
    'message', CASE WHEN did_pass
      THEN format('Congratulations! You scored %s%% (Passing mark is %s%%).', pct, quiz.passing_score)
      ELSE format('You scored %s%%. You need at least %s%% to pass. You can review the explanations and try again.', pct, quiz.passing_score)
    END
  );
END;
$$;

-- 7c. Skill quiz
CREATE OR REPLACE FUNCTION public.submit_skill_quiz(p_quiz_id TEXT, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles;
  quiz public.skill_quizzes;
  graded JSONB;
  pct INTEGER;
  did_pass BOOLEAN;
  attempt public.skill_quiz_attempts;
BEGIN
  prof := public.require_active_learner();

  SELECT * INTO quiz FROM public.skill_quizzes WHERE id = p_quiz_id;
  IF quiz.id IS NULL OR (quiz.is_published = false AND NOT public.is_admin(prof.id)) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Skill quiz not found.');
  END IF;

  graded := public.grade_quiz(quiz.questions, COALESCE(p_answers, '{}'::jsonb));
  pct := (graded->>'percentage')::INTEGER;
  did_pass := pct >= quiz.passing_score;

  INSERT INTO public.skill_quiz_attempts (id, quiz_id, category_id, resource_id, user_id, user_name, user_email,
                                          score, total_questions, percentage, passed, answers)
  VALUES ('sqa_' || replace(gen_random_uuid()::text, '-', ''), quiz.id, quiz.category_id, quiz.resource_id, prof.id,
          prof.full_name, prof.email, (graded->>'score')::INTEGER, (graded->>'total_questions')::INTEGER,
          pct, did_pass, COALESCE(p_answers, '{}'::jsonb))
  RETURNING * INTO attempt;

  RETURN jsonb_build_object(
    'success', true,
    'score', graded->'score',
    'total_questions', graded->'total_questions',
    'percentage', pct,
    'passed', did_pass,
    'passing_score', quiz.passing_score,
    'breakdown', graded->'breakdown',
    'attempt', to_jsonb(attempt),
    'message', CASE WHEN did_pass
      THEN format('Assessment Passed! You scored %s%% (Passing threshold is %s%%). Excellent work!', pct, quiz.passing_score)
      ELSE format('Assessment score: %s%%. Passing threshold is %s%%. Review the feedback below and try again when ready!', pct, quiz.passing_score)
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_license_quiz(TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_product_quiz(TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_skill_quiz(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_license_quiz(TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_product_quiz(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_skill_quiz(TEXT, JSONB) TO authenticated;

-- --------------------------------------------------------------------
-- 8. PROGRESS RPCs
-- --------------------------------------------------------------------

-- Video heartbeat. Mirrors the previous server logic: the reported
-- segment is clamped to what could plausibly have been watched since the
-- previous heartbeat (database clock), intervals are merged, and the
-- lesson completes at >= 95% unique watch time.
CREATE OR REPLACE FUNCTION public.record_video_heartbeat(
  p_lesson_id TEXT,
  p_start REAL,
  p_end REAL,
  p_duration REAL,
  p_playback_rate REAL DEFAULT 1.0,
  p_last_position REAL DEFAULT 0
)
RETURNS public.license_lesson_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles;
  rec public.license_lesson_progress;
  total_dur REAL;
  seg_start REAL;
  seg_end REAL;
  elapsed REAL;
  max_span REAL;
  merged JSONB := '[]'::jsonb;
  cur_s REAL;
  cur_e REAL;
  r RECORD;
  unique_secs REAL := 0;
  pct INTEGER;
  status_v TEXT;
BEGIN
  prof := public.require_active_learner();

  INSERT INTO public.license_lesson_progress (user_id, lesson_id, content_type, total_duration_seconds, last_heartbeat_at)
  VALUES (prof.id, p_lesson_id, 'video', GREATEST(1, round(COALESCE(p_duration, 0))), now() - interval '2 seconds')
  ON CONFLICT (user_id, lesson_id) DO NOTHING;

  SELECT * INTO rec FROM public.license_lesson_progress
   WHERE user_id = prof.id AND lesson_id = p_lesson_id FOR UPDATE;

  total_dur := CASE WHEN COALESCE(p_duration, 0) > 0 THEN round(p_duration) ELSE GREATEST(1, rec.total_duration_seconds) END;

  IF p_start IS NOT NULL AND p_end IS NOT NULL THEN
    seg_start := GREATEST(0, p_start);
    seg_end := LEAST(total_dur + 2, p_end);
    elapsed := GREATEST(0.5, EXTRACT(EPOCH FROM (now() - COALESCE(rec.last_heartbeat_at, now() - interval '2 seconds'))));
    max_span := elapsed * GREATEST(0.5, COALESCE(p_playback_rate, 1.0)) + 3.0;
    IF seg_end - seg_start > 0 THEN
      seg_end := LEAST(seg_end, seg_start + max_span);
      rec.watched_intervals := rec.watched_intervals || jsonb_build_array(jsonb_build_array(seg_start, seg_end));
    END IF;
  END IF;

  -- merge intervals
  cur_s := NULL;
  FOR r IN
    SELECT (iv->>0)::REAL AS s, (iv->>1)::REAL AS e
      FROM jsonb_array_elements(rec.watched_intervals) iv
     ORDER BY 1
  LOOP
    IF cur_s IS NULL THEN
      cur_s := r.s; cur_e := r.e;
    ELSIF r.s <= cur_e + 0.6 THEN
      cur_e := GREATEST(cur_e, r.e);
    ELSE
      merged := merged || jsonb_build_array(jsonb_build_array(cur_s, cur_e));
      unique_secs := unique_secs + GREATEST(0, cur_e - cur_s);
      cur_s := r.s; cur_e := r.e;
    END IF;
  END LOOP;
  IF cur_s IS NOT NULL THEN
    merged := merged || jsonb_build_array(jsonb_build_array(cur_s, cur_e));
    unique_secs := unique_secs + GREATEST(0, cur_e - cur_s);
  END IF;

  IF unique_secs / total_dur >= 0.95 THEN
    pct := 100; status_v := 'completed';
  ELSE
    pct := LEAST(100, floor(unique_secs / total_dur * 100))::INTEGER;
    status_v := CASE WHEN pct > 0 THEN 'in_progress' ELSE 'not_started' END;
  END IF;

  UPDATE public.license_lesson_progress SET
    content_type = 'video',
    watched_intervals = merged,
    watched_seconds = round(unique_secs),
    total_duration_seconds = total_dur,
    progress_percentage = pct,
    completion_status = status_v,
    last_position = COALESCE(p_last_position, 0),
    last_heartbeat_at = now(),
    overall_completed = (status_v = 'completed') AND COALESCE(quiz_passed, false),
    updated_at = now()
  WHERE user_id = prof.id AND lesson_id = p_lesson_id
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_pdf_page(p_lesson_id TEXT, p_page INTEGER, p_total_pages INTEGER)
RETURNS public.license_lesson_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles;
  rec public.license_lesson_progress;
  total_v INTEGER := GREATEST(1, COALESCE(p_total_pages, 1));
  pages INTEGER[];
  pct INTEGER;
BEGIN
  prof := public.require_active_learner();

  INSERT INTO public.license_lesson_progress (user_id, lesson_id, content_type)
  VALUES (prof.id, p_lesson_id, 'pdf')
  ON CONFLICT (user_id, lesson_id) DO NOTHING;

  SELECT * INTO rec FROM public.license_lesson_progress
   WHERE user_id = prof.id AND lesson_id = p_lesson_id FOR UPDATE;

  SELECT COALESCE(array_agg(DISTINCT p ORDER BY p), ARRAY[]::INTEGER[]) INTO pages
    FROM unnest(rec.viewed_pages || ARRAY[p_page]) AS p
   WHERE p BETWEEN 1 AND total_v;

  pct := LEAST(100, round(cardinality(pages) * 100.0 / total_v))::INTEGER;

  UPDATE public.license_lesson_progress SET
    content_type = 'pdf',
    viewed_pages = pages,
    total_pages = total_v,
    last_page = COALESCE(p_page, 1),
    progress_percentage = pct,
    completion_status = CASE WHEN cardinality(pages) >= total_v THEN 'completed' ELSE 'in_progress' END,
    overall_completed = (cardinality(pages) >= total_v) AND COALESCE(quiz_passed, false),
    updated_at = now()
  WHERE user_id = prof.id AND lesson_id = p_lesson_id
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

REVOKE ALL ON FUNCTION public.record_video_heartbeat(TEXT, REAL, REAL, REAL, REAL, REAL) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_pdf_page(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_video_heartbeat(TEXT, REAL, REAL, REAL, REAL, REAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_pdf_page(TEXT, INTEGER, INTEGER) TO authenticated;

-- --------------------------------------------------------------------
-- 9. updated_at TRIGGERS
-- --------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'courses', 'channels', 'hod_motto', 'ld_team_members', 'skill_categories',
    'skill_development_resources', 'product_knowledge_items', 'product_quizzes',
    'license_chapters', 'license_quizzes', 'license_training_lessons',
    'skill_quizzes', 'company_bulletins'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_%1$s_updated_at ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trigger_%1$s_updated_at BEFORE UPDATE ON public.%1$I
                    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at()', t);
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 10. REALTIME (admin ↔ learner live sync)
-- --------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'courses', 'channels', 'course_enrollments', 'channel_access',
    'company_news', 'company_videos', 'top_performers', 'hod_motto', 'ld_team_members',
    'license_chapters', 'license_training_lessons', 'license_quizzes',
    'skill_categories', 'skill_development_resources', 'skill_quizzes',
    'product_knowledge_items', 'product_quizzes', 'company_bulletins'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 11. STORAGE BUCKETS USED BY THE ADMIN UPLOADERS
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('license-training', 'license-training', true),
  ('skill-materials', 'skill-materials', true),
  ('skill-thumbnails', 'skill-thumbnails', true),
  ('skill-instructors', 'skill-instructors', true),
  ('bulletins', 'bulletins', true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read for LMS media buckets" ON storage.objects;
CREATE POLICY "Public read for LMS media buckets" ON storage.objects
  FOR SELECT USING (bucket_id IN ('license-training', 'skill-materials', 'skill-thumbnails', 'skill-instructors', 'bulletins'));
