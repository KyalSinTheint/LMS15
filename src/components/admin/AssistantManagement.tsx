import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Inbox,
  Loader2,
  MessageCircleQuestion,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { closeOnBackdrop } from '../../lib/closeOnOutside';
import { extractPdfKnowledge } from '../../lib/chatbotIngest';
import {
  answerQuestion,
  ChatbotDocument,
  ChatbotEntry,
  ChatbotQuestion,
  deleteDocument,
  deleteEntry,
  dismissQuestion,
  documentUrl,
  listDocuments,
  listEntries,
  listQuestions,
  saveDocument,
  saveFaq,
  setEntryPublished,
} from '../../lib/chatbotApi';
import { buildKnowledge } from '../../lib/chatbotKnowledge';
import { KnowledgeIndex, minAnswerScore } from '../../lib/chatbotSearch';
import { MentorMascot } from '../chatbot/MentorMascot';
import { PdfViewerModal } from '../common/PdfViewerModal';

type UploadJob = { name: string; status: 'reading' | 'saving' | 'done' | 'error'; message: string };

const card = 'bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6';
const inputCls =
  'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#176B98]/30 focus:border-[#176B98]';

const timeAgo = (iso?: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

export const AssistantManagement: React.FC = () => {
  const { currentUser, showToast, products: allProducts } = useLms();
  const [documents, setDocuments] = useState<ChatbotDocument[]>([]);
  const [entries, setEntries] = useState<ChatbotEntry[]>([]);
  const [questions, setQuestions] = useState<ChatbotQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'faq' | 'section'>('faq');
  const [filter, setFilter] = useState('');
  const [faqModal, setFaqModal] = useState<{ id?: string; question: string; answer: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, { text: string; addToFaq: boolean }>>({});
  const [viewing, setViewing] = useState<{ url: string; title: string } | null>(null);
  const [testQuery, setTestQuery] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [d, e, q] = await Promise.all([listDocuments(), listEntries(), listQuestions()]);
      setDocuments(d);
      setEntries(e);
      setQuestions(q);
      setSetupError(null);
    } catch (err) {
      setSetupError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---- PDF upload -------------------------------------------------------
  const updateJob = (name: string, patch: Partial<UploadJob>) =>
    setJobs((prev) => prev.map((j) => (j.name === name ? { ...j, ...patch } : j)));

  const ingest = async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfs.length < files.length) showToast('warning', 'Only PDF files', 'Other file types were skipped.');
    for (const file of pdfs) {
      if (file.size > 40 * 1024 * 1024) {
        showToast('error', 'File too large', `${file.name} is larger than 40 MB.`);
        continue;
      }
      const existing = documents.find((d) => d.file_name.toLowerCase() === file.name.toLowerCase());
      if (existing && !window.confirm(`"${file.name}" is already in the knowledge base. Replace it with this new version?`)) continue;

      setJobs((prev) => [{ name: file.name, status: 'reading', message: 'Reading the PDF…' }, ...prev.filter((j) => j.name !== file.name)]);
      try {
        const knowledge = await extractPdfKnowledge(file, (page, total) =>
          updateJob(file.name, { message: `Reading page ${page} of ${total}…` })
        );
        if (knowledge.textLength < 30 || knowledge.entries.length === 0) {
          updateJob(file.name, {
            status: 'error',
            message:
              'No text could be read. This is probably a scanned PDF (pictures of pages). Please upload a PDF exported from Word or another text document.',
          });
          continue;
        }
        updateJob(file.name, { status: 'saving', message: `Saving ${knowledge.entries.length} entries…` });
        await saveDocument(file, knowledge, currentUser, existing);
        const faqs = knowledge.entries.filter((e) => e.kind === 'faq').length;
        updateJob(file.name, {
          status: 'done',
          message: `${existing ? 'Updated' : 'Added'}: ${faqs} questions & answers and ${knowledge.entries.length - faqs} text sections from ${knowledge.pageCount} pages.`,
        });
      } catch (err) {
        updateJob(file.name, { status: 'error', message: (err as Error).message });
      }
    }
    await refresh();
  };

  const removeDocument = async (doc: ChatbotDocument) => {
    if (!window.confirm(`Remove "${doc.title}" and everything the assistant learned from it?`)) return;
    try {
      await deleteDocument(doc);
      showToast('info', 'Document removed', doc.title);
      await refresh();
    } catch (err) {
      showToast('error', 'Not removed', (err as Error).message);
    }
  };

  const openDocument = async (doc: ChatbotDocument) => {
    const url = await documentUrl(doc);
    if (url) setViewing({ url, title: doc.title });
    else showToast('error', 'Cannot open', 'The file could not be found.');
  };

  // ---- Entries -----------------------------------------------------------
  const docTitle = useMemo(() => new Map(documents.map((d) => [d.id, d.title])), [documents]);
  const visibleEntries = entries.filter(
    (e) =>
      e.kind === tab &&
      (!filter.trim() ||
        `${e.question || ''} ${e.title || ''} ${e.content}`.toLowerCase().includes(filter.trim().toLowerCase()))
  );

  const run = async (fn: () => Promise<void>, ok?: string) => {
    try {
      await fn();
      if (ok) showToast('success', ok, '');
      await refresh();
    } catch (err) {
      showToast('error', 'Not saved', (err as Error).message);
    }
  };

  // ---- Test box ------------------------------------------------------------
  const products = useMemo(() => allProducts.filter((p) => p.is_published || p.status === 'published'), [allProducts]);
  const testIndex = useMemo(
    () =>
      new KnowledgeIndex(
        buildKnowledge(
          entries.filter((e) => e.is_published).map((e) => ({ ...e, document_title: e.document_id ? docTitle.get(e.document_id) : null })),
          products
        )
      ),
    [entries, products, docTitle]
  );
  const testHits = testQuery.trim() ? testIndex.search(testQuery, 3) : [];

  const openQuestions = questions.filter((q) => q.status === 'open');
  const faqCount = entries.filter((e) => e.kind === 'faq').length;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MentorMascot className="w-12 h-12 shrink-0" />
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">LMS Assistant</h2>
            <p className="text-xs text-slate-500">
              Upload policy PDFs and FAQs. Employees ask questions in Myanmar or English from the chat icon in the portal.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="self-start px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {setupError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="leading-relaxed">{setupError}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'PDF documents', value: documents.length },
          { label: 'Questions & answers', value: faqCount },
          { label: 'Text sections', value: entries.length - faqCount },
          { label: 'Waiting for an answer', value: openQuestions.length, alert: openQuestions.length > 0 },
        ].map((s) => (
          <div key={s.label} className={`${card} !p-4`}>
            <p className="text-[11px] font-semibold text-slate-500">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.alert ? 'text-red-600' : 'text-slate-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Upload */}
      <section className={card}>
        <h3 className="text-sm font-bold text-slate-900 mb-1">Teach the assistant with PDF files</h3>
        <p className="text-xs text-slate-500 mb-4">
          Policy handbooks, product guides, claim procedures, FAQ lists. Text is read automatically:{' '}
          <strong>Q: … / A: …</strong> (or <strong>မေး – … / ဖြေ – …</strong>) become questions & answers, everything else is
          searchable by section. Uploading a file with the same name again replaces the old version.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            ingest(Array.from(e.dataTransfer.files));
          }}
          className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? 'border-[#176B98] bg-sky-50' : 'border-slate-300 bg-slate-50/60'
          }`}
        >
          <Upload className="w-7 h-7 text-[#176B98] mx-auto mb-2" />
          <p className="text-xs text-slate-600 mb-3">Drag PDF files here, or</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold cursor-pointer"
          >
            Choose PDF files
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              if (files.length) ingest(files);
            }}
          />
        </div>

        {jobs.length > 0 && (
          <ul className="mt-4 space-y-2">
            {jobs.map((j) => (
              <li
                key={j.name}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
                  j.status === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : j.status === 'done'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-sky-50 border-sky-200 text-sky-900'
                }`}
              >
                {j.status === 'error' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : j.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                )}
                <div className="min-w-0">
                  <p className="font-bold truncate">{j.name}</p>
                  <p className="mt-0.5">{j.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {documents.length > 0 && (
          <ul className="mt-5 divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {documents.map((d) => (
              <li key={d.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{d.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {d.page_count} pages · {d.entry_count} entries · {d.uploaded_by_name || 'Admin'} · {timeAgo(d.updated_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openDocument(d)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDocument(d)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Questions inbox */}
      <section className={card}>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
          <Inbox className="w-4 h-4 text-[#176B98]" />
          Questions the assistant could not answer
          {openQuestions.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">{openQuestions.length}</span>
          )}
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Employees sent these to the L&D team. Your answer is shown to them in the chat, and can be saved as a new FAQ.
        </p>
        {openQuestions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No questions waiting. 🎉</p>
        ) : (
          <ul className="space-y-3">
            {openQuestions.map((q) => {
              const a = answers[q.id] || { text: '', addToFaq: true };
              return (
                <li key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <p className="text-sm font-bold text-slate-900">“{q.question}”</p>
                  <p className="text-[11px] text-slate-500">
                    {q.user_name || 'Employee'} · {timeAgo(q.created_at)}
                  </p>
                  <textarea
                    value={a.text}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { ...a, text: e.target.value } }))}
                    rows={3}
                    placeholder="Write the answer…"
                    className={inputCls}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={a.addToFaq}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { ...a, addToFaq: e.target.checked } }))}
                        className="accent-[#176B98]"
                      />
                      Also save as an FAQ for everyone
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => run(() => dismissQuestion(q.id), 'Question dismissed')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        disabled={a.text.trim().length < 2}
                        onClick={() => run(() => answerQuestion(q, a.text, currentUser, a.addToFaq), 'Answer sent')}
                        className="px-3.5 py-1.5 rounded-lg bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                      >
                        Send answer
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Knowledge */}
      <section className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['faq', 'section'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  tab === k ? 'bg-white text-[#176B98] shadow-xs' : 'text-slate-600'
                }`}
              >
                {k === 'faq' ? `Questions & answers (${faqCount})` : `Text sections (${entries.length - faqCount})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className={`${inputCls} pl-8 w-44`} />
            </div>
            <button
              type="button"
              onClick={() => setFaqModal({ question: '', answer: '' })}
              className="px-3 py-2 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-2xl max-h-[520px] overflow-y-auto">
            {visibleEntries.slice(0, 300).map((e) => (
              <li key={e.id} className={`px-4 py-3 flex gap-3 ${e.is_published ? '' : 'opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900">{e.kind === 'faq' ? e.question : e.title || 'Untitled section'}</p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{e.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {e.document_id ? `${docTitle.get(e.document_id) || 'PDF'}${e.page ? ` · p.${e.page}` : ''}` : 'Added by an admin'}
                  </p>
                </div>
                <div className="flex items-start gap-1 shrink-0">
                  <button
                    type="button"
                    title={e.is_published ? 'Hide from the assistant' : 'Show in the assistant'}
                    onClick={() => run(() => setEntryPublished(e.id, !e.is_published))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                  >
                    {e.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  {e.kind === 'faq' && (
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => setFaqModal({ id: e.id, question: e.question || '', answer: e.content })}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => window.confirm('Delete this entry?') && run(() => deleteEntry(e.id))}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Try it */}
      <section className={card}>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
          <MessageCircleQuestion className="w-4 h-4 text-[#176B98]" />
          Try a question
        </h3>
        <p className="text-xs text-slate-500 mb-3">See which answer employees would get (includes Product Knowledge Hub content).</p>
        <input value={testQuery} onChange={(e) => setTestQuery(e.target.value)} placeholder="e.g. What is the grace period? / ဝင်ရောက်နိုင်သည့် အသက်" className={inputCls} />
        {testQuery.trim() && (
          <ul className="mt-3 space-y-2">
            {testHits.length === 0 || testHits[0].score < minAnswerScore(testQuery) ? (
              <li className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                No good match — employees would be offered to send this question to the L&D team.
              </li>
            ) : (
              testHits.map((h, i) => (
                <li key={h.item.id} className={`text-xs rounded-xl p-3 border ${i === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="font-bold text-slate-900">
                    {i === 0 ? 'Answer: ' : 'Also: '}
                    {h.item.question || h.item.title}
                    <span className="ml-2 font-mono text-[10px] text-slate-400">{Math.round(h.score * 100)}%</span>
                  </p>
                  <p className="text-slate-600 mt-0.5 line-clamp-2">{h.item.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{h.item.source}</p>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {/* FAQ editor */}
      {faqModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" {...closeOnBackdrop(() => setFaqModal(null))}>
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{faqModal.id ? 'Edit FAQ' : 'Add FAQ'}</h3>
                <button type="button" onClick={() => setFaqModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question (Myanmar or English)</label>
                <textarea rows={2} value={faqModal.question} onChange={(e) => setFaqModal({ ...faqModal, question: e.target.value })} className={inputCls} />
                <p className="text-[11px] text-slate-400 mt-1">Tip: add the same question in both languages, or several ways of asking it, on separate lines.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Answer</label>
                <textarea rows={5} value={faqModal.answer} onChange={(e) => setFaqModal({ ...faqModal, answer: e.target.value })} className={inputCls} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setFaqModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={faqModal.question.trim().length < 3 || faqModal.answer.trim().length < 2}
                  onClick={async () => {
                    await run(() => saveFaq(currentUser.id, faqModal), 'FAQ saved');
                    setFaqModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Save FAQ
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {viewing && (
        <PdfViewerModal isOpen onClose={() => setViewing(null)} fileUrl={viewing.url} title={viewing.title} />
      )}
    </div>
  );
};
