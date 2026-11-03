-- ====================================================================
-- Migration: 20261111_quiz_draw_retake_fix.sql
-- Fix: after "Retry Assessment" the score was counted out of the whole
-- question bank (e.g. 7 / 54) instead of the learner's 10 questions.
--
-- The learner's set of questions is no longer deleted when they submit;
-- it is marked as used instead:
--  * grading always uses the learner's latest set for that quiz, so a
--    retry of the same questions is still scored out of 10;
--  * opening the quiz again after submitting gives a new random set.
--
-- Requires 20261110_quiz_question_bank.sql. Safe to re-run.
-- ====================================================================

ALTER TABLE public.quiz_draws ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

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

  -- Same set again while the learner has not submitted it yet
  SELECT d.question_ids INTO ids
    FROM public.quiz_draws d
   WHERE d.user_id = prof.id AND d.quiz_table = p_quiz_table AND d.quiz_id = p_quiz_id
     AND d.used_at IS NULL
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
    INSERT INTO public.quiz_draws (user_id, quiz_table, quiz_id, question_ids, created_at, used_at)
    VALUES (prof.id, p_quiz_table, p_quiz_id, ids, now(), NULL)
    ON CONFLICT (user_id, quiz_table, quiz_id)
      DO UPDATE SET question_ids = EXCLUDED.question_ids, created_at = now(), used_at = NULL;
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
    -- The learner's latest set for this quiz (also after it was submitted once)
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
      UPDATE public.quiz_draws SET used_at = now()
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
