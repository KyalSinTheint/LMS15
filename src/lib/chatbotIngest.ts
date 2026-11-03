/**
 * Turns an uploaded PDF or Word (.docx) file into assistant knowledge, in the
 * admin's browser.
 *
 * 1. Text is read page by page with pdf.js (PDF) or paragraph by paragraph
 *    (Word). Damaged Myanmar text from PDF/Word conversions is repaired.
 * 2. Question/answer pairs become FAQ entries, e.g.
 *      Q: What is the entry age?        မေး - ဝင်ရောက်နိုင်သည့် အသက်
 *      A: 18 to 60 years.               ဖြေ - ၁၈ နှစ်မှ ၆၀ နှစ်
 *    (also "Question 1:", "Answer:", "1. ...?" followed by the answer).
 * 3. All other text becomes sections of about one paragraph, each with the
 *    nearest heading and its page number.
 */
import { loadPdfFromData } from './pdfUtils';
import { readDocxParagraphs } from './docxText';
import { fixMyanmar } from './myanmarFix';
import { linesToKnowledge, type Line, type PdfKnowledge } from './chatbotEntries';

export type { ExtractedEntry, PdfKnowledge } from './chatbotEntries';

/** Reads every page's text, rebuilding lines from the text positions. */
export async function extractLines(file: File, onProgress?: (page: number, total: number) => void): Promise<{ lines: Line[]; pageCount: number }> {
  const doc = await loadPdfFromData(await file.arrayBuffer());
  const lines: Line[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      onProgress?.(p, doc.numPages);
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      let current = '';
      let lastY: number | null = null;
      for (const raw of content.items) {
        const item = raw as { str?: string; transform?: number[]; hasEOL?: boolean };
        if (typeof item.str !== 'string') continue;
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && current.trim()) {
          lines.push({ text: current.trim(), page: p });
          current = '';
        }
        current += item.str;
        if (y !== null) lastY = y;
        if (item.hasEOL) {
          if (current.trim()) lines.push({ text: current.trim(), page: p });
          current = '';
        }
      }
      if (current.trim()) lines.push({ text: current.trim(), page: p });
      page.cleanup();
    }
    return { lines: lines.map((l) => ({ ...l, text: fixMyanmar(l.text).replace(/\s+/g, ' ') })), pageCount: doc.numPages };
  } finally {
    await doc.loadingTask.destroy().catch(() => undefined);
  }
}

export const isDocx = (file: File) =>
  /\.docx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Reads a PDF or Word file into knowledge entries. */
export async function extractKnowledge(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PdfKnowledge> {
  if (!isDocx(file)) return extractPdfKnowledge(file, onProgress);
  const paragraphs = await readDocxParagraphs(file);
  const lines: Line[] = [];
  let chapter = 0;
  for (const p of paragraphs) {
    const text = fixMyanmar(p.text).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    // Word has no pages: number the chapters instead ("Chapter 3 …")
    const ch = text.match(/^Chapter\s*[–—-]?\s*(\d{1,2})\b/i);
    if (ch) chapter = Number(ch[1]);
    lines.push({ text, page: chapter, heading: ch ? 1 : p.heading });
  }
  return linesToKnowledge(lines, 0);
}

export async function extractPdfKnowledge(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PdfKnowledge> {
  const { lines, pageCount } = await extractLines(file, onProgress);
  return linesToKnowledge(lines, pageCount);
}

