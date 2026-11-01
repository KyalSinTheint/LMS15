/**
 * Visual (Word-like) editor for Product Knowledge content.
 *
 * - Paste from Word, Google Docs or a web page: headings, bold, lists etc.
 *   are kept. Plain text with "- " bullets or "## " headings is formatted too.
 * - Images can be added anywhere between paragraphs: Image button, paste a
 *   screenshot, or drag & drop a picture. They are uploaded to Supabase
 *   Storage (product-images) and can have a caption.
 * - Content is still saved as the same lightweight Markdown as before, so the
 *   learner page, pamphlet pages and existing products keep working.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from 'tiptap-markdown';
import {
  Bold,
  Edit3,
  Eye,
  HelpCircle,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { ProductRichTextRenderer } from '../common/ProductRichTextRenderer';
import { uploadImageFile } from '../../lib/storageUtils';
import { useLms } from '../../context/LmsContext';

interface ProductKnowledgeRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const IMAGE_BUCKET = 'product-images';

/**
 * Images are block elements: write each one on its own line
 * (![caption](url)), which is how the learner page and pamphlet find them.
 */
const BlockImage = Image.extend({
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void; ensureNewLine: () => void },
          node: { attrs: { src?: string; alt?: string } }
        ) {
          const alt = String(node.attrs.alt || '').replace(/[[\]\n]/g, ' ').trim();
          const src = String(node.attrs.src || '').replace(/[()\s]/g, encodeURIComponent);
          state.ensureNewLine();
          state.write(`![${alt}](${src})`);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});

const STANDARD_TEMPLATE = `## Product Overview & Purpose
Comprehensive explanation of what this insurance plan covers, how it operates, and why it benefits policyholders.

## Key Benefits & Policyholder Protections
- Guaranteed Sum Assured payout upon maturity or demise
- 24/7 worldwide coverage for accidental trauma and bodily injuries
- Flexible reversionary bonuses added annually
- Premium freeze and guaranteed renewability

## Policy Terms & Features
1. Flexible Policy Durations: 5, 10, 15, or 20 years
2. Entry Age: 18 to 60 years old (Myanmar citizens)
3. Grace Period: 30 days for premium renewal

## Underwriting & Eligibility Criteria
- Standard health declaration required
- Minimum Sum Assured: 5,000,000 MMK
- Premium payment channels: KBZPay, KBZ Bank transfer, or authorized agents

## Claims & Settlement Procedure
In the event of a covered claim, contact KBZLife customer care within 14 days with official medical certificates and identity documentation.`;

const getMarkdown = (editor: Editor): string =>
  ((editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown() || '').trim();

/** Older content used •, ✦, ▪ or – as bullets: turn them into real list items for the editor. */
const normalizeForEditor = (md: string) => (md || '').replace(/^(\s*)[•✦▪–]\s+/gm, '$1- ');

const imageFilesFrom = (list: FileList | null | undefined): File[] =>
  Array.from(list || []).filter((f) => f.type.startsWith('image/'));

/** Pasted HTML may contain images that only exist on the copier's computer (Word: file:///…). Drop those. */
const stripUnreachableImages = (html: string) =>
  html.replace(/<img\b[^>]*>/gi, (tag) => (/\ssrc=["']https?:\/\//i.test(tag) ? tag : ''));

const ToolbarButton: React.FC<{
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, active, disabled, children }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()} // keep the editor selection
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    className={`min-w-7 h-7 px-1.5 rounded-md text-xs font-black flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
      active ? 'bg-[#176B98] text-white' : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

const Group: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-0.5 bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">{children}</div>
);

export const ProductKnowledgeRichEditor: React.FC<ProductKnowledgeRichEditorProps> = ({
  value,
  onChange,
  placeholder = 'Paste or type the product knowledge here. Use the toolbar for headings and lists, and the image button to add pictures between paragraphs…',
  minHeight = '320px',
}) => {
  const { showToast } = useLms();
  const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef<string>(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const uploadRef = useRef<(files: File[], at?: number) => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        strike: false,
        link: false,
        underline: false,
      }),
      BlockImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
        linkify: false,
        breaks: true,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: normalizeForEditor(value),
    editorProps: {
      attributes: {
        class: 'kbz-editor focus:outline-none px-5 py-4 text-sm text-slate-800',
        'aria-label': 'Product knowledge content',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      transformPastedHTML: stripUnreachableImages,
      handlePaste: (_view, event) => {
        const files = imageFilesFrom(event.clipboardData?.files);
        if (files.length === 0) return false;
        const html = event.clipboardData?.getData('text/html') || '';
        const text = event.clipboardData?.getData('text/plain') || '';
        // Screenshot / copied picture (no usable HTML) → upload it
        if (/<img\b[^>]*\ssrc=["']https?:\/\//i.test(html) || text.trim().length > 0) return false;
        event.preventDefault();
        uploadRef.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFilesFrom(event.dataTransfer?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        uploadRef.current(files, coords?.pos);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const md = getMarkdown(ed);
      lastEmitted.current = md;
      onChangeRef.current(md);
    },
  });

  // Load new content when the parent replaces it (e.g. editing another product)
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(normalizeForEditor(value), { emitUpdate: false });
  }, [editor, value]);

  const uploadImages = useCallback(
    async (files: File[], at?: number) => {
      if (!editor) return;
      for (const file of files) {
        setUploading((n) => n + 1);
        try {
          const res = await uploadImageFile(file, IMAGE_BUCKET);
          if (!res.success || !res.url) {
            showToast('error', 'Image Not Added', res.error || 'The image could not be uploaded.');
            continue;
          }
          const node = { type: 'image', attrs: { src: res.url, alt: '' } };
          if (typeof at === 'number') {
            editor.chain().focus().insertContentAt(at, node).run();
            at += 1;
          } else {
            editor.chain().focus().insertContent(node).run();
          }
        } finally {
          setUploading((n) => n - 1);
        }
      }
    },
    [editor, showToast]
  );
  uploadRef.current = uploadImages;

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            h1: ed.isActive('heading', { level: 1 }),
            h2: ed.isActive('heading', { level: 2 }),
            h3: ed.isActive('heading', { level: 3 }),
            paragraph: ed.isActive('paragraph'),
            bold: ed.isActive('bold'),
            italic: ed.isActive('italic'),
            bullet: ed.isActive('bulletList'),
            ordered: ed.isActive('orderedList'),
            quote: ed.isActive('blockquote'),
            imageSelected: ed.isActive('image'),
            imageAlt: (ed.isActive('image') ? (ed.getAttributes('image').alt as string) : '') || '',
            canUndo: ed.can().undo(),
            canRedo: ed.can().redo(),
          }
        : null,
  });

  const insertTemplate = () => {
    if (!editor) return;
    if (getMarkdown(editor) && !window.confirm('Add the standard KBZLife product sections at the end of the current content?')) return;
    editor.chain().focus('end').insertContent(STANDARD_TEMPLATE).run();
  };

  const wordCount = value.trim() ? value.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim().split(/\s+/).length : 0;
  const imageCount = (value.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-[#176B98]/20 focus-within:border-[#176B98] transition-all">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className={`flex flex-wrap items-center gap-1 ${viewMode === 'preview' ? 'opacity-40 pointer-events-none' : ''}`}>
          <Group>
            <ToolbarButton title="Normal text" active={state?.paragraph} onClick={() => editor?.chain().focus().setParagraph().run()}>
              <Pilcrow className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Heading 1 (new pamphlet section)" active={state?.h1} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
              H1
            </ToolbarButton>
            <ToolbarButton title="Heading 2 (new pamphlet section)" active={state?.h2} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </ToolbarButton>
            <ToolbarButton title="Heading 3 (sub-heading)" active={state?.h3} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </ToolbarButton>
          </Group>
          <Group>
            <ToolbarButton title="Bold" active={state?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Italic" active={state?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
          </Group>
          <Group>
            <ToolbarButton title="Bullet list" active={state?.bullet} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
              <List className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Numbered list" active={state?.ordered} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Highlighted note" active={state?.quote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
              <Quote className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Divider line" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
              <Minus className="w-3.5 h-3.5" />
            </ToolbarButton>
          </Group>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading > 0}
            className="h-7 px-2.5 rounded-lg bg-[#176B98] hover:bg-[#12567a] text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs"
            title="Add a picture at the cursor position"
          >
            {uploading > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            <span>{uploading > 0 ? 'Uploading…' : 'Add Image'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = imageFilesFrom(e.target.files);
              e.target.value = '';
              if (files.length) uploadImages(files);
            }}
          />
          <Group>
            <ToolbarButton title="Undo" disabled={!state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
              <Undo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Redo" disabled={!state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
              <Redo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
          </Group>
          <button
            type="button"
            onClick={insertTemplate}
            className="h-7 px-2.5 text-[11px] rounded-lg bg-sky-50 hover:bg-sky-100 text-[#176B98] font-bold border border-sky-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            title="Insert the standard product outline"
          >
            <Sparkles className="w-3 h-3" />
            <span>Standard Sections</span>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
          {(['write', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === mode ? 'bg-[#176B98] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {mode === 'write' ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{mode === 'write' ? 'Edit' : 'Preview'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected image: caption & remove */}
      {viewMode === 'write' && state?.imageSelected && (
        <div className="bg-sky-50 border-b border-sky-200 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
          <label className="font-bold text-[#176B98]" htmlFor="kbz-image-caption">
            Image caption
          </label>
          <input
            id="kbz-image-caption"
            type="text"
            value={state.imageAlt}
            maxLength={160}
            onChange={(e) => editor?.chain().updateAttributes('image', { alt: e.target.value.replace(/[[\]]/g, '') }).run()}
            placeholder="Optional text shown under the picture"
            className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg border border-sky-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#176B98]/30"
          />
          <button
            type="button"
            onClick={() => editor?.chain().focus().deleteSelection().run()}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-50 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove image
          </button>
        </div>
      )}

      {/* Editor / preview */}
      <div className={viewMode === 'write' ? '' : 'hidden'} style={{ minHeight }}>
        <EditorContent editor={editor} style={{ minHeight }} className="max-h-[70vh] overflow-y-auto" />
      </div>
      {viewMode === 'preview' && (
        <div style={{ minHeight }} className="w-full p-5 overflow-y-auto max-h-[70vh] bg-slate-50/40 text-xs sm:text-sm">
          {value.trim() ? (
            <ProductRichTextRenderer content={value} />
          ) : (
            <div className="text-center py-12 text-slate-400 italic">Nothing to preview yet.</div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>
            {imageCount} image{imageCount === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Paste from Word or a website · Paste or drop pictures · H1/H2 start a new pamphlet page</span>
        </div>
      </div>
    </div>
  );
};
