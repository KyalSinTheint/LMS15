/**
 * Turns lines of text (from a PDF or Word file) into assistant knowledge:
 * question/answer pairs become FAQ entries, other text becomes sections of
 * about one paragraph with the nearest heading. No browser APIs, so it can
 * also be tested on its own.
 */

export interface ExtractedEntry {
  kind: 'faq' | 'section';
  question?: string;
  title?: string;
  content: string;
  page: number;
}

export interface PdfKnowledge {
  pageCount: number;
  entries: ExtractedEntry[];
  /** Characters of text found; 0 means a scanned (image-only) PDF */
  textLength: number;
}

export interface Line {
  text: string;
  page: number;
  /** Word heading style (1–4); 0 for normal text */
  heading?: number;
}

const Q_MARK = /^(?:Q(?:uestion)?\.?\s*\d*|Ques\.?\s*\d*|မေးခွန်း\s*[၀-၉\d]*|မေး)\s*[:.)\-–—]\s*(.*)$/i;
const A_MARK = /^(?:A(?:ns(?:wer)?)?\.?|အဖြေ|ဖြေ(?:ကြားချက်)?)\s*[:.)\-–—]\s*(.*)$/i;
const NUMBERED_QUESTION = /^(?:\d+|[၀-၉]+)[.)]\s+(.+[?？])$/;
const SENTENCE_END = /[.!?။,;:)\]]$/;

function looksLikeHeading(line: string, next?: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 70 || SENTENCE_END.test(t)) return false;
  if (/^(?:\d+(?:\.\d+)*|[IVX]+|[A-Z])[.)]?\s+\S/.test(t)) return true; // "1. Benefits", "2.1 Terms"
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase()) return true; // ALL CAPS
  // Short line followed by a longer paragraph line (also works for Myanmar)
  return Boolean(next && next.trim().length > t.length * 1.6 && t.split(' ').length <= 9);
}

/** Splits long text into pieces of about `max` characters at sentence ends. */
function splitText(text: string, max = 700): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?။]+[.!?။]+["')\]]*\s*|[^.!?။]+$/g) || [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + s).length > max) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function linesToKnowledge(lines: Line[], pageCount: number): PdfKnowledge {
  const textLength = lines.reduce((n, l) => n + l.text.length, 0);
  const entries: ExtractedEntry[] = [];

  let heading = '';
  let section: Line[] = [];
  const seen = new Set<string>();
  const flushSection = () => {
    const text = section.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();
    // Skip scraps (labels from diagrams, page numbers) and repeated text
    const words = text.split(' ').length;
    const substantial = text.length >= 40 && (words >= 6 || /[\u1000-\u109F]{15}/.test(text));
    if (substantial) {
      for (const piece of splitText(text)) {
        const key = piece.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ kind: 'section', title: heading || undefined, content: piece, page: section[0].page });
      }
    }
    section = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].text;

    // ---- Question / answer pair ------------------------------------
    const qMatch = line.match(Q_MARK) || line.match(NUMBERED_QUESTION);
    if (qMatch) {
      let j = i + 1;
      let question = qMatch[1].trim();
      // question may continue on following lines until the answer marker
      while (j < lines.length && !A_MARK.test(lines[j].text) && !Q_MARK.test(lines[j].text) && !/[?？]$/.test(question) && j - i < 4) {
        question += ' ' + lines[j].text;
        j++;
      }
      const aStart = j < lines.length ? lines[j].text.match(A_MARK) : null;
      const answerLines: string[] = [];
      if (aStart) {
        if (aStart[1].trim()) answerLines.push(aStart[1].trim());
        j++;
      }
      if (aStart || /[?？]$/.test(question)) {
        while (
          j < lines.length &&
          !Q_MARK.test(lines[j].text) &&
          !NUMBERED_QUESTION.test(lines[j].text) &&
          !(answerLines.length > 0 && looksLikeHeading(lines[j].text, lines[j + 1]?.text) && !aStart)
        ) {
          answerLines.push(lines[j].text);
          j++;
        }
        const answer = answerLines.join(' ').replace(/\s+/g, ' ').trim();
        if (question && answer) {
          flushSection();
          entries.push({ kind: 'faq', question, title: heading || undefined, content: answer, page: lines[i].page });
          i = j - 1;
          continue;
        }
      }
    }

    // ---- Heading ---------------------------------------------------
    if (lines[i].heading || looksLikeHeading(line, lines[i + 1]?.text)) {
      flushSection();
      heading = line.replace(/^(?:\d+(?:\.\d+)*|[IVX]+)[.)]?\s+/, '').trim();
      continue;
    }

    // ---- Body text (new section at each page start when long) ------
    if (section.length && section[section.length - 1].page !== lines[i].page && section.map((l) => l.text).join(' ').length > 400) {
      flushSection();
    }
    section.push(lines[i]);
  }
  flushSection();

  return { pageCount, entries, textLength };
}
