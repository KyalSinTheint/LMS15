/**
 * Reads quiz questions that are already written in a PDF (a question bank),
 * instead of generating new ones. Understands the usual layouts:
 *
 *   1. What is a premium?                 Q1) What is a premium?
 *   A. The price of cover                 (a) The price of cover   a) …
 *   B. A claim   C. A tax   D. A fee      (options may share one line)
 *   Answer: A                             Ans - (a) / Correct answer: A
 *   Explanation: …                        (optional)
 *
 * Answers can also come from an "Answer Key" list at the end
 * ("1. A  2. C  3. B" or one per line).
 */
import { extractLines } from './chatbotIngest';
import type { GeneratedQuestionItem } from '../components/admin/PdfQuizGeneratorModal';
import { letterIndex, type SpreadsheetQuizResult } from './quizSpreadsheet';
import { unicodeTexts } from './zawgyi';

const QUESTION = /^(?:Q(?:uestion)?\s*\.?\s*|မေးခွန်း\s*)?([\d၀-၉]{1,3})\s*[.)\-:။]\s*(.+)$/i;
const OPTION = /^[(（]?([A-Fa-fကခဂဃငစ])\s*[.)）\]။]\s*(.+)$/;
const ANSWER = /^(?:(?:correct\s+)?(?:answer|ans)|အဖြေမှန်|အဖြေ)\s*(?:is)?\s*[:.\-–=။]?\s*[(（]?([A-Fa-f](?![a-z])|[ကခဂဃငစ])/i;
const EXPLANATION = /^(?:explanation|reason)\s*[:.\-–]\s*(.+)$/i;
const KEY_HEADING = /\banswer\s*keys?\b|\banswers\b\s*$|အဖြေများ|အဖြေလွှာ/i;
const KEY_PAIR = /([\d၀-၉]{1,3})\s*[.)\-:=။]\s*[(（]?([A-Fa-f](?![a-z])|[ကခဂဃငစ])/g;
const toNumber = (t: string) => Number(t.replace(/[၀-၉]/g, (d) => String(d.charCodeAt(0) - 0x1040)));

interface Draft {
  n: number;
  text: string;
  options: string[];
  answer?: number;
  explanation?: string;
}

/** "A. one B. two C. three" on one line → ["one", "two", "three"] with their letters */
function splitInlineOptions(line: string): { letter: number; text: string }[] | null {
  const parts = line.split(/\s+(?=[(（]?(?:[B-Fb-f]|[ခဂဃငစ])\s*[.)）\]။]\s)/);
  if (parts.length < 2) return null;
  const out: { letter: number; text: string }[] = [];
  for (const p of parts) {
    const m = p.trim().match(OPTION);
    if (!m) return null;
    out.push({ letter: letterIndex(m[1]), text: m[2].trim() });
  }
  return out;
}

export function parseQuestionLines(lines: string[]): SpreadsheetQuizResult {
  const drafts: Draft[] = [];
  const key = new Map<number, number>();
  let cur: Draft | null = null;
  let inKey = false;
  let lastWasOption = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    if (KEY_HEADING.test(line) && line.length < 40) {
      inKey = true;
      cur = null;
      continue;
    }
    if (inKey) {
      for (const m of line.matchAll(KEY_PAIR)) key.set(toNumber(m[1]), letterIndex(m[2]));
      continue;
    }

    const ans = line.match(ANSWER);
    if (ans && cur) {
      cur.answer = letterIndex(ans[1]);
      lastWasOption = false;
      continue;
    }
    const exp = line.match(EXPLANATION);
    if (exp && cur) {
      cur.explanation = exp[1].trim();
      lastWasOption = false;
      continue;
    }

    const inline = splitInlineOptions(line);
    if (inline && cur) {
      for (const o of inline) cur.options[o.letter] = o.text;
      lastWasOption = true;
      continue;
    }
    const opt = line.match(OPTION);
    if (opt && cur) {
      cur.options[letterIndex(opt[1])] = opt[2].trim();
      lastWasOption = true;
      continue;
    }

    const q = line.match(QUESTION);
    if (q && (!cur || cur.options.length > 0 || cur.answer !== undefined)) {
      cur = { n: toNumber(q[1]), text: q[2].trim(), options: [] };
      drafts.push(cur);
      lastWasOption = false;
      continue;
    }

    // Continuation of a long question or option
    if (cur) {
      if (lastWasOption && cur.options.length) cur.options[cur.options.length - 1] += ' ' + line;
      else if (!cur.options.length) cur.text += ' ' + line;
    }
  }

  const questions: GeneratedQuestionItem[] = [];
  const problems: string[] = [];
  for (const d of drafts) {
    const all = Array.from({ length: d.options.length }, (_, i) => d.options[i] || '');
    const options = all.filter(Boolean);
    if (options.length < 2) continue; // numbered text that is not a question
    const letter = d.answer ?? key.get(d.n);
    if (letter === undefined) {
      problems.push(`Question ${d.n}: no answer found (add "Answer: B" or an Answer Key).`);
      continue;
    }
    if (!all[letter]) {
      problems.push(`Question ${d.n}: the answer (option ${letter + 1}) is not one of its options.`);
      continue;
    }
    questions.push({
      question_text: d.text,
      options,
      correct_option_index: all.slice(0, letter).filter(Boolean).length,
      explanation: d.explanation || '',
    });
  }
  return { questions, problems };
}

/** Questions written in a PDF (text PDFs only; scanned pages have no text). */
export async function readPdfQuestions(file: File): Promise<SpreadsheetQuizResult> {
  const { lines } = await extractLines(file);
  // extractLines already repairs damaged Pyidaungsu text; Zawgyi PDFs are converted here
  return parseQuestionLines(unicodeTexts(lines.map((l) => l.text)).texts);
}
