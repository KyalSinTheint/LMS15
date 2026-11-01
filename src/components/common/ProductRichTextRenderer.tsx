import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';
import { closeOnBackdrop } from '../../lib/closeOnOutside';

/** A line that is only an image: ![caption](url) or ![caption](url "title") */
export const IMAGE_LINE = /^!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)$/;

/** Markdown escapes written by the visual editor (e.g. \* or \#) are shown as plain characters. */
const unescapeMarkdown = (text: string) => text.replace(/\\([\\`*_{}\[\]()#+\-.!>|~])/g, '$1');

const isSafeImageUrl = (url: string) => /^(https?:\/\/|\/)/i.test(url);

/** Full-screen view of a content image; closes on outside click or Escape. */
const ImageLightbox: React.FC<{ src: string; caption: string; onClose: () => void }> = ({ src, caption, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={caption || 'Image'}
      {...closeOnBackdrop(onClose)}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
        aria-label="Close image"
      >
        <X className="w-5 h-5" />
      </button>
      <img src={src} alt={caption} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
      {caption && <p className="mt-3 text-sm text-white/90 text-center max-w-2xl">{caption}</p>}
    </div>,
    document.body
  );
};

/** An image inside product content: fits its column, tap/click to enlarge. */
const ContentImage: React.FC<{ src: string; caption: string; paper: boolean }> = ({ src, caption, paper }) => {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="my-4 p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
        Image could not be loaded{caption ? `: ${caption}` : ''}
      </div>
    );
  }
  return (
    <figure className="my-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full rounded-xl overflow-hidden border border-slate-200 bg-white cursor-zoom-in"
        aria-label={caption ? `Enlarge image: ${caption}` : 'Enlarge image'}
      >
        <img
          src={src}
          alt={caption}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`w-full object-contain ${paper ? 'max-h-[300px]' : 'max-h-[460px]'} bg-white`}
          draggable={false}
        />
        <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/60 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-4 h-4" />
        </span>
      </button>
      {caption && (
        <figcaption className={`mt-1.5 text-center text-xs italic ${paper ? 'text-stone-600' : 'text-slate-500 dark:text-slate-400'}`}>
          {caption}
        </figcaption>
      )}
      {open && <ImageLightbox src={src} caption={caption} onClose={() => setOpen(false)} />}
    </figure>
  );
};

interface ProductRichTextRendererProps {
  content: string;
  className?: string;
  /** Always render light-on-paper colours (ignores dark mode), e.g. inside the Pamphlet View. */
  paper?: boolean;
}

export const ProductRichTextRenderer: React.FC<ProductRichTextRendererProps> = ({
  content,
  className = '',
  paper = false,
}) => {
  // In paper mode, drop dark-mode colours and print body text in black.
  const c = (cls: string) =>
    paper
      ? cls.replace(/\s*dark:\S+/g, '').replace(/\btext-slate-(?:600|700|800|900)\b/g, 'text-black')
      : cls;

  if (!content || !content.trim()) {
    return null;
  }

  // Helper to parse inline formatting (**bold**, *italic*, `code`)
  const renderInlineFormatted = (text: string): React.ReactNode => {
    // Split by bold (**text**)
    const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={idx} className={c("font-extrabold text-slate-900 dark:text-white")}>
            {unescapeMarkdown(part.slice(2, -2))}
          </strong>
        );
      }
      // Check for code (`code`)
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cPart, cIdx) => {
        if (cPart.startsWith('`') && cPart.endsWith('`') && cPart.length >= 2) {
          return (
            <code
              key={`${idx}-${cIdx}`}
              className={c("px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#176B98] dark:text-[#38bdf8] font-mono text-xs")}
            >
              {cPart.slice(1, -1)}
            </code>
          );
        }

        // Check for italic (*text* or _text_)
        const italicParts = cPart.split(/(\*[^*]+\*|_[^_]+_)/g);
        return italicParts.map((iPart, iIdx) => {
          if (
            ((iPart.startsWith('*') && iPart.endsWith('*')) ||
              (iPart.startsWith('_') && iPart.endsWith('_'))) &&
            iPart.length >= 2
          ) {
            return (
              <em key={`${idx}-${cIdx}-${iIdx}`} className={c("italic text-slate-800 dark:text-slate-200")}>
                {unescapeMarkdown(iPart.slice(1, -1))}
              </em>
            );
          }
          return unescapeMarkdown(iPart);
        });
      });
    });
  };

  // Parse lines into blocks
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let currentParagraphLines: string[] = [];
  let blockKey = 0;

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join('\n').trim();
      if (text) {
        blocks.push(
          <p
            key={`p-${blockKey++}`}
            className={c("text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal my-3 whitespace-pre-line break-words")}
          >
            {renderInlineFormatted(text)}
          </p>
        );
      }
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        blocks.push(
          <ul key={`ul-${blockKey++}`} className={c("space-y-2.5 my-4 pl-1")}>
            {currentList.items.map((item, idx) => (
              <li key={idx} className={c("flex items-start gap-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed")}>
                <span className={c("w-2 h-2 rounded-full bg-[#176B98] dark:bg-[#38bdf8] mt-2 shrink-0 ring-4 ring-sky-100 dark:ring-sky-950/60")} />
                <span className={c("flex-1 whitespace-pre-line break-words")}>{renderInlineFormatted(item)}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`ol-${blockKey++}`} className={c("space-y-2.5 my-4 pl-1")}>
            {currentList.items.map((item, idx) => (
              <li key={idx} className={c("flex items-start gap-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed")}>
                <span className={c("w-5 h-5 rounded-lg bg-[#176B98]/10 dark:bg-[#176B98]/30 text-[#176B98] dark:text-[#38bdf8] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-[#176B98]/20 dark:border-[#38bdf8]/30")}>
                  {idx + 1}
                </span>
                <span className={c("flex-1 whitespace-pre-line break-words")}>{renderInlineFormatted(item)}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // A trailing backslash is a line break written by the visual editor
    const trimmed = rawLine.trim().replace(/\\$/, '').trimEnd();

    // Image on its own line
    const image = trimmed.match(IMAGE_LINE);
    if (image) {
      flushParagraph();
      flushList();
      const [, caption, url] = image;
      if (isSafeImageUrl(url)) {
        blocks.push(<ContentImage key={`img-${blockKey++}`} src={url} caption={unescapeMarkdown(caption).trim()} paper={paper} />);
      }
      continue;
    }

    // Empty line separates paragraphs and ends lists
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushParagraph();
      flushList();
      blocks.push(
        <hr key={`hr-${blockKey++}`} className={c("my-6 border-slate-200 dark:border-slate-800")} />
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('#')) {
      flushParagraph();
      flushList();

      if (trimmed.startsWith('### ')) {
        blocks.push(
          <h3
            key={`h3-${blockKey++}`}
            className={c("text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-5 mb-2 tracking-tight flex items-center gap-2")}
          >
            <span className={c("w-1.5 h-4 rounded-full bg-[#176B98] dark:bg-[#38bdf8]")} />
            <span>{renderInlineFormatted(trimmed.slice(4))}</span>
          </h3>
        );
      } else if (trimmed.startsWith('## ')) {
        blocks.push(
          <h2
            key={`h2-${blockKey++}`}
            className={c("text-base sm:text-lg font-black text-[#176B98] dark:text-[#38bdf8] mt-6 mb-3 tracking-tight border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2")}
          >
            <span>{renderInlineFormatted(trimmed.slice(3))}</span>
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        blocks.push(
          <h1
            key={`h1-${blockKey++}`}
            className={c("text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-6 mb-3 tracking-tight border-b-2 border-[#176B98]/20 dark:border-[#38bdf8]/30 pb-2.5")}
          >
            {renderInlineFormatted(trimmed.slice(2))}
          </h1>
        );
      }
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushParagraph();
      flushList();
      const quoteText = trimmed.replace(/^>\s?/, '');
      blocks.push(
        <blockquote
          key={`quote-${blockKey++}`}
          className={c("p-4 my-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border-l-4 border-[#176B98] dark:border-[#38bdf8] text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium italic shadow-2xs")}
        >
          {renderInlineFormatted(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Bullet List Item (- or * or • or ✦ or ▪ or –)
    const bulletMatch = trimmed.match(/^[-*•✦▪–]\s*(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered List Item (1. or 1))
    const numberMatch = trimmed.match(/^\d+[.)]\s*(.+)$/);
    if (numberMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberMatch[1]);
      continue;
    }

    // Normal text line - buffer into paragraph
    flushList();
    currentParagraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return <div className={c(`product-rich-text space-y-1 ${className}`)}>{blocks}</div>;
};
