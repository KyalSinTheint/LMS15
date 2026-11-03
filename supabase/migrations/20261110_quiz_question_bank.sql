-- ====================================================================
-- Migration: 20261110_quiz_question_bank.sql
-- Quizzes work as a question bank: each quiz can hold many questions
-- (e.g. imported from Excel or a PDF), and every learner gets their own
-- random set of N questions (default 10) in a random order. A retake
-- draws a new set.
--
--  * questions_per_attempt on license / product / skill quizzes
--    (default 10; a quiz with fewer questions shows all, shuffled)
--  * draw_quiz_questions(): picks the learner's questions (without the
--    answer key) and remembers them; reopening the quiz before
--    submitting shows the same set
--  * grade_quiz(): grades only the drawn questions, so leaving questions
--    out cannot raise the score; the draw is then cleared
--
-- Safe to re-run. Run in Supabase → SQL Editor.
-- ====================================================================

ALTER TABLE public.license_quizzes ADD COLUMN IF NOT EXISTS questions_per_attempt INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.product_quizzes ADD COLUMN IF NOT EXISTS questions_per_attempt INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.skill_quizzes ADD COLUMN IF NOT EXISTS questions_per_attempt INTEGER NOT NULL DEFAULT 10;

-- Learner views also show how many questions an attempt has
CREATE OR REPLACE VIEW public.license_quizzes_learner AS
  SELECT id, chapter_id, lesson_id, title, description, passing_score, is_published,
         public.strip_quiz_answers(questions) AS questions, created_at, updated_at, questions_per_attempt
  FROM public.license_quizzes
  WHERE is_published = true;

CREATE OR REPLACE VIEW public.product_quizzes_learner AS
  SELECT id, product_id, title, description, passing_score, max_attempts, is_published,
         public.strip_quiz_answers(questions) AS questions, created_at, updated_at, questions_per_attempt
  FROM public.product_quizzes
  WHERE is_published = true;

CREATE OR REPLACE VIEW public.skill_quizzes_learner AS
  SELECT id, category_id, resource_id, title, description, passing_score, is_published,
         public.strip_quiz_answers(questions) AS questions, created_at, updated_at, questions_per_attempt
  FROM public.skill_quizzes
  WHERE is_published = true;

REVOKE ALL ON public.license_quizzes_learner, public.product_quizzes_learner, public.skill_quizzes_learner FROM anon, PUBLIC;
GRANT SELECT ON public.license_quizzes_learner, public.product_quizzes_learner, public.skill_quizzes_learner TO authenticated;

-- The questions each learner was given for their current attempt
CREATE TABLE IF NOT EXISTS public.quiz_draws (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiz_table TEXT NOT NULL,
    quiz_id TEXT NOT NULL,
    question_ids JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, quiz_table, quiz_id)
);
ALTER TABLE public.quiz_draws ENABLE ROW LEVEL SECURITY; -- no policies: only the functions below use it

-- --------------------------------------------------------------------
-- Learner: get my questions for this quiz (random set, random order)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.draw_quiz_questions(p_quiz_table TEXT, p_quiz_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles;
  qs JSONB;
  per_attempt INTEGER;
  published BOOLEAN;
  all_ids JSONB;
  ids JSONB;
BEGIN
  prof := public.require_active_learner();
  IF p_quiz_table NOT IN ('license_quizzes', 'product_quizzes', 'skill_quizzes') THEN
    RAISE EXCEPTION 'Unknown quiz type.';
  END IF;

  EXECUTE format('SELECT questions, questions_per_attempt, is_published FROM public.%I WHERE id = $1', p_quiz_table)
     INTO qs, per_attempt, published
    USING p_quiz_id;
  IF qs IS NULL OR (published = false AND NOT public.is_admin(prof.id)) THEN
    RAISE EXCEPTION 'Quiz not found.';
  END IF;

  SELECT COALESCE(jsonb_agg(q->>'id'), '[]'::jsonb) INTO all_ids
    FROM jsonb_array_elements(qs) q WHERE q->>'id' IS NOT NULL;

  -- Same set again if the learner reopens the quiz before submitting
  SELECT d.question_ids INTO ids
    FROM public.quiz_draws d
   WHERE d.user_id = prof.id AND d.quiz_table = p_quiz_table AND d.quiz_id = p_quiz_id
     AND d.created_at > now() - interval '12 hours';

  IF ids IS NULL OR jsonb_array_length(ids) = 0 OR NOT (ids <@ all_ids) THEN
    SELECT COALESCE(jsonb_agg(id), '[]'::jsonb) INTO ids
      FROM (
        SELECT q->>'id' AS id
          FROM jsonb_array_elements(qs) q
         WHERE q->>'id' IS NOT NULL
         ORDER BY random()
         LIMIT GREATEST(COALESCE(per_attempt, 10), 1)
      ) s;
    INSERT INTO public.quiz_draws (user_id, quiz_table, quiz_id, question_ids, created_at)
    VALUES (prof.id, p_quiz_table, p_quiz_id, ids, now())
    ON CONFLICT (user_id, quiz_table, quiz_id)
      DO UPDATE SET question_ids = EXCLUDED.question_ids, created_at = now();
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(q - 'correct_option_index' - 'explanation' ORDER BY d.pos), '[]'::jsonb)
      FROM jsonb_array_elements_text(ids) WITH ORDINALITY AS d(id, pos)
      JOIN jsonb_array_elements(qs) q ON q->>'id' = d.id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.draw_quiz_questions(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.draw_quiz_questions(TEXT, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- Grader: when the learner has a draw for this quiz, only those
-- questions count (and the draw is cleared, so a retake gets new ones).
-- Same result shape as before: {score,total_questions,percentage,breakdown}
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grade_quiz(p_questions JSONB, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q JSONB;
  sel JSONB;
  correct INTEGER;
  is_correct BOOLEAN;
  score INTEGER := 0;
  total INTEGER := 0;
  breakdown JSONB := '[]'::jsonb;
  all_ids JSONB;
  draw public.quiz_draws%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(x->>'id'), '[]'::jsonb) INTO all_ids
      FROM jsonb_array_elements(COALESCE(p_questions, '[]'::jsonb)) x WHERE x->>'id' IS NOT NULL;
    SELECT * INTO draw
      FROM public.quiz_draws d
     WHERE d.user_id = auth.uid()
       AND jsonb_array_length(d.question_ids) > 0
       AND d.question_ids <@ all_ids
     ORDER BY d.created_at DESC
     LIMIT 1;
    IF draw.user_id IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(x ORDER BY d.pos), '[]'::jsonb) INTO p_questions
        FROM jsonb_array_elements_text(draw.question_ids) WITH ORDINALITY AS d(id, pos)
        JOIN jsonb_array_elements(p_questions) x ON x->>'id' = d.id;
      DELETE FROM public.quiz_draws
       WHERE user_id = draw.user_id AND quiz_table = draw.quiz_table AND quiz_id = draw.quiz_id;
    END IF;
  END IF;

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
REVOKE ALL ON FUNCTION public.grade_quiz(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
