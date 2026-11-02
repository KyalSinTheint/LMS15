/**
 * Shows the text of a Word (.docx) file inside the portal. Browsers cannot
 * display .docx files themselves, so the paragraphs are read in the browser
 * (headings kept) and shown as a simple document, with a Download button.
 */
import React, { useEffect, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { readDocxParagraphs, DocxParagraph } from '../../lib/docxText';
import { closeOnBackdrop } from '../../lib/closeOnOutside';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';

export const DocxViewerModal: React.FC<{ fileUrl: string; title: string; fileName?: string; onClose: () => void }> = ({
  fileUrl,
  title,
  fileName,
  onClose,
}) => {
  const [paragraphs, setParagraphs] = useState<DocxParagraph[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useBodyScrollLock(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`The file could not be downloaded (${res.status}).`);
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        const paras = await readDocxParagraphs(new File([blob], fileName || 'document.docx'));
        if (cancelled) return;
        setBlobUrl(url);
        setParagraphs(paras);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileUrl, fileName]);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-center justify-center p-0 sm:p-4" {...closeOnBackdrop(onClose)}>
      <div className="bg-white w-full h-full sm:h-[90vh] sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 shrink-0">
          <p className="flex-1 min-w-0 text-sm font-bold text-slate-900 truncate">{title}</p>
          <a
            href={blobUrl || fileUrl}
            download={fileName || `${title}.docx`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </a>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-6">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : !paragraphs ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Opening the Word file…
            </p>
          ) : (
            <article className="bg-white max-w-2xl mx-auto rounded-lg shadow-sm px-5 py-6 sm:px-10 sm:py-10 text-[14px] leading-relaxed text-slate-800 break-words">
              {paragraphs.map((p, i) =>
                p.heading || /^Chapter\s*[–—-]?\s*\d/i.test(p.text) ? (
                  <h3 key={i} className="font-bold text-[#176B98] text-base mt-5 mb-2">
                    {p.text}
                  </h3>
                ) : (
                  <p key={i} className="mb-2">
                    {p.text}
                  </p>
                )
              )}
            </article>
          )}
        </div>
      </div>
    </div>
  );
};
