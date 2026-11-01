/**
 * Supabase access for the LMS Assistant (see 20261107_chatbot.sql).
 * Row Level Security decides who may do what: employees read knowledge and
 * send questions; administrators manage everything.
 */
import { getSupabaseClient } from './supabase';
import type { ExtractedEntry } from './chatbotIngest';

export interface ChatbotDocument {
  id: string;
  title: string;
  file_name: string;
  storage_path?: string | null;
  file_size?: number | null;
  page_count?: number | null;
  entry_count: number;
  uploaded_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatbotEntry {
  id: string;
  document_id?: string | null;
  kind: 'faq' | 'section';
  question?: string | null;
  title?: string | null;
  content: string;
  page?: number | null;
  is_published: boolean;
  created_at: string;
}

export interface ChatbotQuestion {
  id: string;
  user_id: string;
  user_name?: string | null;
  question: string;
  status: 'open' | 'answered' | 'dismissed';
  answer?: string | null;
  answered_by_name?: string | null;
  answered_at?: string | null;
  seen_at?: string | null;
  created_at: string;
}

const BUCKET = 'chatbot-documents';

const db = () => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client;
};

const friendly = (err: unknown): Error => {
  const message = (err as { message?: string })?.message || String(err);
  if (/chatbot_|schema cache|42P01|PGRST20[45]/i.test(message)) {
    return new Error('The assistant is not set up yet. Please ask the system developer to finish the assistant setup.');
  }
  return new Error(message);
};

// ---------------------------------------------------------------------
// Knowledge (employees + admins)
// ---------------------------------------------------------------------
export async function loadPublishedEntries(): Promise<(ChatbotEntry & { document_title?: string | null })[]> {
  const { data, error } = await db()
    .from('chatbot_entries')
    .select('id, document_id, kind, question, title, content, page, is_published, created_at, chatbot_documents(title)')
    .eq('is_published', true)
    .limit(5000);
  if (error) throw friendly(error);
  return (data || []).map((row: Record<string, unknown>) => {
    const doc = row.chatbot_documents as { title?: string } | { title?: string }[] | null;
    const title = Array.isArray(doc) ? doc[0]?.title : doc?.title;
    return { ...(row as unknown as ChatbotEntry), document_title: title ?? null };
  });
}

// ---------------------------------------------------------------------
// Questions the assistant could not answer
// ---------------------------------------------------------------------
export async function askTeam(userId: string, userName: string, question: string): Promise<void> {
  const { error } = await db()
    .from('chatbot_questions')
    .insert({ user_id: userId, user_name: userName, question: question.trim().slice(0, 1000) });
  if (error) throw friendly(error);
}

export async function loadMyQuestions(userId: string): Promise<ChatbotQuestion[]> {
  const { data, error } = await db()
    .from('chatbot_questions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw friendly(error);
  return (data || []) as ChatbotQuestion[];
}

export async function markAnswersSeen(): Promise<void> {
  await db().rpc('mark_chatbot_answers_seen');
}

// ---------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------
export async function listDocuments(): Promise<ChatbotDocument[]> {
  const { data, error } = await db().from('chatbot_documents').select('*').order('updated_at', { ascending: false });
  if (error) throw friendly(error);
  return (data || []) as ChatbotDocument[];
}

export async function listEntries(): Promise<ChatbotEntry[]> {
  const { data, error } = await db()
    .from('chatbot_entries')
    .select('id, document_id, kind, question, title, content, page, is_published, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw friendly(error);
  return (data || []) as ChatbotEntry[];
}

export async function listQuestions(): Promise<ChatbotQuestion[]> {
  const { data, error } = await db().from('chatbot_questions').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw friendly(error);
  return (data || []) as ChatbotQuestion[];
}

/**
 * Saves an uploaded PDF and its extracted knowledge. When `replace` is given
 * (same document uploaded again), the old version and its entries are
 * removed only after the new one is saved.
 */
export async function saveDocument(
  file: File,
  extracted: { pageCount: number; entries: ExtractedEntry[] },
  user: { id: string; full_name: string },
  replace?: ChatbotDocument | null
): Promise<ChatbotDocument> {
  const client = db();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  const storagePath = `${user.id}/${Date.now()}_${safeName}`;
  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw friendly(uploadError);

  const title = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
  const { data: doc, error: docError } = await client
    .from('chatbot_documents')
    .insert({
      title,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      page_count: extracted.pageCount,
      entry_count: extracted.entries.length,
      uploaded_by: user.id,
      uploaded_by_name: user.full_name,
    })
    .select()
    .single();
  if (docError || !doc) {
    await client.storage.from(BUCKET).remove([storagePath]);
    throw friendly(docError);
  }

  const rows = extracted.entries.map((e) => ({
    document_id: doc.id,
    kind: e.kind,
    question: e.question || null,
    title: e.title || null,
    content: e.content,
    page: e.page,
    created_by: user.id,
  }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await client.from('chatbot_entries').insert(rows.slice(i, i + 200));
    if (error) {
      await client.from('chatbot_documents').delete().eq('id', doc.id);
      await client.storage.from(BUCKET).remove([storagePath]);
      throw friendly(error);
    }
  }

  if (replace) await deleteDocument(replace);
  return doc as ChatbotDocument;
}

export async function deleteDocument(doc: ChatbotDocument): Promise<void> {
  const client = db();
  const { error } = await client.from('chatbot_documents').delete().eq('id', doc.id);
  if (error) throw friendly(error);
  if (doc.storage_path) await client.storage.from(BUCKET).remove([doc.storage_path]);
}

export async function documentUrl(doc: ChatbotDocument): Promise<string | null> {
  if (!doc.storage_path) return null;
  const { data } = await db().storage.from(BUCKET).createSignedUrl(doc.storage_path, 600);
  return data?.signedUrl || null;
}

export async function saveFaq(userId: string, faq: { id?: string; question: string; answer: string }): Promise<void> {
  const row = { kind: 'faq', question: faq.question.trim(), content: faq.answer.trim(), is_published: true };
  const { error } = faq.id
    ? await db().from('chatbot_entries').update({ ...row, updated_at: new Date().toISOString() }).eq('id', faq.id)
    : await db().from('chatbot_entries').insert({ ...row, created_by: userId });
  if (error) throw friendly(error);
}

export async function setEntryPublished(id: string, isPublished: boolean): Promise<void> {
  const { error } = await db().from('chatbot_entries').update({ is_published: isPublished }).eq('id', id);
  if (error) throw friendly(error);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await db().from('chatbot_entries').delete().eq('id', id);
  if (error) throw friendly(error);
}

export async function answerQuestion(
  q: ChatbotQuestion,
  answer: string,
  admin: { id: string; full_name: string },
  addToFaq: boolean
): Promise<void> {
  const { error } = await db()
    .from('chatbot_questions')
    .update({
      status: 'answered',
      answer: answer.trim(),
      answered_by: admin.id,
      answered_by_name: admin.full_name,
      answered_at: new Date().toISOString(),
      seen_at: null,
    })
    .eq('id', q.id);
  if (error) throw friendly(error);
  if (addToFaq) await saveFaq(admin.id, { question: q.question, answer });
}

export async function dismissQuestion(id: string): Promise<void> {
  const { error } = await db().from('chatbot_questions').update({ status: 'dismissed' }).eq('id', id);
  if (error) throw friendly(error);
}
