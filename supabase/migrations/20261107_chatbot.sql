-- ====================================================================
-- LMS Assistant (chatbot) knowledge base. No AI service, no extra cost:
-- answers are found in this knowledge base by the app.
--
--  chatbot_documents : PDFs uploaded by admins (Admin → Assistant)
--  chatbot_entries   : searchable knowledge: FAQ pairs and text sections
--                      taken from the PDFs, plus FAQs written by admins
--  chatbot_questions : questions the assistant could not answer, sent
--                      to the L&D team; the admin's answer is shown to
--                      the employee and saved as a new FAQ
--
-- Safe to run more than once.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.chatbot_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT,
    file_size BIGINT,
    page_count INTEGER,
    entry_count INTEGER NOT NULL DEFAULT 0,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.chatbot_documents(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'section' CHECK (kind IN ('faq', 'section')),
    question TEXT,
    title TEXT,
    content TEXT NOT NULL,
    page INTEGER,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatbot_entries_document ON public.chatbot_entries (document_id);

CREATE TABLE IF NOT EXISTS public.chatbot_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    question TEXT NOT NULL CHECK (length(question) BETWEEN 2 AND 1000),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'dismissed')),
    answer TEXT,
    answered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    answered_by_name TEXT,
    answered_at TIMESTAMPTZ,
    seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatbot_questions_user ON public.chatbot_questions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_questions_status ON public.chatbot_questions (status, created_at DESC);

ALTER TABLE public.chatbot_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_questions ENABLE ROW LEVEL SECURITY;

-- Active employees can read the knowledge; only admins change it
DROP POLICY IF EXISTS "Employees read chatbot documents" ON public.chatbot_documents;
CREATE POLICY "Employees read chatbot documents" ON public.chatbot_documents
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_status IN ('active', 'approved')));
DROP POLICY IF EXISTS "Admins manage chatbot documents" ON public.chatbot_documents;
CREATE POLICY "Admins manage chatbot documents" ON public.chatbot_documents
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Employees read chatbot entries" ON public.chatbot_entries;
CREATE POLICY "Employees read chatbot entries" ON public.chatbot_entries
  FOR SELECT TO authenticated
  USING (
    (is_published AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_status IN ('active', 'approved')))
    OR public.is_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admins manage chatbot entries" ON public.chatbot_entries;
CREATE POLICY "Admins manage chatbot entries" ON public.chatbot_entries
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Employees send and read their own questions; admins see and answer all
DROP POLICY IF EXISTS "Employees read own chatbot questions" ON public.chatbot_questions;
CREATE POLICY "Employees read own chatbot questions" ON public.chatbot_questions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Employees ask chatbot questions" ON public.chatbot_questions;
CREATE POLICY "Employees ask chatbot questions" ON public.chatbot_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND status = 'open' AND answer IS NULL
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_status IN ('active', 'approved'))
  );
DROP POLICY IF EXISTS "Admins manage chatbot questions" ON public.chatbot_questions;
CREATE POLICY "Admins manage chatbot questions" ON public.chatbot_questions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Employees may only mark their own answered questions as seen
CREATE OR REPLACE FUNCTION public.mark_chatbot_answers_seen()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chatbot_questions
     SET seen_at = now()
   WHERE user_id = auth.uid() AND status = 'answered' AND seen_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.mark_chatbot_answers_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_chatbot_answers_seen() TO authenticated;

-- Uploaded PDFs: private bucket, admins only
INSERT INTO storage.buckets (id, name, public)
VALUES ('chatbot-documents', 'chatbot-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage chatbot document files" ON storage.objects;
CREATE POLICY "Admins manage chatbot document files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'chatbot-documents' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'chatbot-documents' AND public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload schema';
