/**
 * Reads quiz questions from an Excel (.xlsx) or CSV file, so admins can
 * write many questions in Excel and import them all at once.
 *
 * One question per row. Columns (header names are matched loosely, so
 * "Question", "Option A", "A", "Choice 1", "Answer", "Correct" all work):
 *   Question | Option A | Option B | Option C | Option D | Correct Answer | Explanation
 * Up to 6 options; at least 2. "Correct Answer" may be a letter (B),
 * a number (2) or the full text of the correct option.
 * Without a header row the columns are read in the order above.
 */
import { readZipEntry } from './docxText';
import { unicodeTexts } from './zawgyi';
import type { GeneratedQuestionItem } from '../components/admin/PdfQuizGeneratorModal';

export const isSpreadsheet = (file: File) => /\.(xlsx|xlsm|csv|xls)$/i.test(file.name);

// ---------------------------------------------------------------------------
// Reading cells
// ---------------------------------------------------------------------------

/** RFC 4180 CSV: quoted fields, "" escapes, commas / new lines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const t = text.replace(/^﻿/, '');
  // Excel in some regions saves CSV with ";" — use whichever appears more in the first line
  const firstLine = t.split(/\r?\n/, 1)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const colIndex = (ref: string) => {
  const letters = ref.replace(/[^A-Z]/gi, '').toUpperCase();
  let n = 0;
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
};

/** The first worksheet of an .xlsx file as rows of text. */
async function readXlsx(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const decode = (b: Uint8Array | null) => (b ? new TextDecoder().decode(b) : '');
  const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');

  // Shared strings (most text cells point into this list)
  const shared: string[] = [];
  const sst = decode(await readZipEntry(buf, 'xl/sharedStrings.xml'));
  if (sst) {
    const doc = parse(sst);
    const items = doc.getElementsByTagName('si');
    for (let i = 0; i < items.length; i++) {
      const ts = items[i].getElementsByTagName('t');
      let s = '';
      for (let j = 0; j < ts.length; j++) s += ts[j].textContent || '';
      shared.push(s);
    }
  }

  // First sheet in workbook order
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = decode(await readZipEntry(buf, 'xl/workbook.xml'));
  const rels = decode(await readZipEntry(buf, 'xl/_rels/workbook.xml.rels'));
  if (wb && rels) {
    const first = parse(wb).getElementsByTagName('sheet')[0];
    const rid = first?.getAttribute('r:id') || first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const relList = parse(rels).getElementsByTagName('Relationship');
    for (let i = 0; i < relList.length; i++) {
      if (relList[i].getAttribute('Id') === rid) {
        const target = relList[i].getAttribute('Target') || '';
        sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
      }
    }
  }
  const sheetXml = decode(await readZipEntry(buf, sheetPath));
  if (!sheetXml) throw new Error('No worksheet was found in this Excel file.');

  const rows: string[][] = [];
  const rowEls = parse(sheetXml).getElementsByTagName('row');
  for (let r = 0; r < rowEls.length; r++) {
    const cells = rowEls[r].getElementsByTagName('c');
    const row: string[] = [];
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const ref = cell.getAttribute('r');
      const idx = ref ? colIndex(ref) : row.length;
      const type = cell.getAttribute('t');
      let value = '';
      if (type === 's') value = shared[Number(cell.getElementsByTagName('v')[0]?.textContent || -1)] ?? '';
      else if (type === 'inlineStr') {
        const ts = cell.getElementsByTagName('t');
        for (let j = 0; j < ts.length; j++) value += ts[j].textContent || '';
      } else if (type === 'b') value = cell.getElementsByTagName('v')[0]?.textContent === '1' ? 'TRUE' : 'FALSE';
      else value = cell.getElementsByTagName('v')[0]?.textContent || '';
      while (row.length < idx) row.push('');
      row[idx] = value;
    }
    rows.push(row);
  }
  return rows;
}

export async function readSpreadsheetRows(file: File): Promise<string[][]> {
  if (/\.xls$/i.test(file.name)) {
    throw new Error('Old Excel files (.xls) cannot be read. In Excel choose File → Save As → "Excel Workbook (.xlsx)" and upload that file.');
  }
  const rows = /\.csv$/i.test(file.name) ? parseCsv(await file.text()) : await readXlsx(file);
  // Zawgyi-font Myanmar text → Unicode
  const flat = rows.flat();
  const { texts, converted } = unicodeTexts(flat);
  if (!converted) return rows;
  let i = 0;
  return rows.map((r) => r.map(() => texts[i++]));
}

// ---------------------------------------------------------------------------
// Rows → questions
// ---------------------------------------------------------------------------

type Col = 'question' | 'option' | 'answer' | 'explanation' | null;

function headerKind(h: string): { kind: Col; option?: number } {
  const t = h.trim().toLowerCase();
  if (!t) return { kind: null };
  if (/^(no\.?|#|sr\.?|s\/n|number)$/.test(t)) return { kind: null };
  if (/explan|reason|rationale|ရှင်းလင်း/.test(t)) return { kind: 'explanation' };
  if (/correct|answer|key|အဖြေ/.test(t)) return { kind: 'answer' };
  if (/question|မေးခွန်း/.test(t)) return { kind: 'question' };
  const m = t.match(/^(?:option|choice|opt\.?|ans(?:wer)?\s*option|ရွေးချယ်(?:စရာ|ရန်)?)?\s*[\s_-]*[(（]?([a-fကခဂဃငစ]|[1-6၁-၆])[)）]?$/);
  if (m) return { kind: 'option', option: /[1-6၁-၆]/.test(m[1]) ? digitValue(m[1]) - 1 : letterIndex(m[1]) };
  return { kind: null };
}

/** Option letters: A–F, or the Myanmar က ခ ဂ ဃ င စ */
export const LETTERS = 'A-Fa-fကခဂဃငစ';
const MM_LETTERS = 'ကခဂဃငစ';
/** 0 for A / a / က, 1 for B / ခ … */
export const letterIndex = (ch: string) => {
  const mm = MM_LETTERS.indexOf(ch);
  return mm >= 0 ? mm : ch.toUpperCase().charCodeAt(0) - 65;
};
/** "2" or the Myanmar "၂" → 2 */
export const digitValue = (t: string) => Number(t.replace(/[၀-၉]/g, (d) => String(d.charCodeAt(0) - 0x1040)));

const OPTION_LETTER = new RegExp(`^[(（]?([${LETTERS}])\\s*[.)）\\]:\\-။၊]\\s*`);
const stripOptionLetter = (t: string) => t.replace(OPTION_LETTER, '').trim();
const loose = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();

/**
 * Which option is correct? Accepts "B", "(b)", "b)", "2", "B. Motor Insurance",
 * "Answer: B", or the option text itself. Returns the index among the
 * non-empty options, or -1.
 */
export function matchAnswer(answerRaw: string, all: string[]): number {
  const options = all.filter(Boolean);
  const toFiltered = (i: number) => (i >= 0 && i < all.length && all[i] ? all.slice(0, i).filter(Boolean).length : -1);
  const answer = answerRaw
    .replace(/^(?:correct\s+)?(?:answer|ans)\s*(?:is)?\s*[:.\-–=]?\s*/i, '')
    .replace(/^(?:အဖြေမှန်|အဖြေ)\s*[:.\-–=။]?\s*/, '')
    .trim();
  if (!answer) return -1;

  // The full text of an option ("Motor Insurance")
  const byText = options.findIndex((o) => loose(o) === loose(answer));
  if (byText >= 0) return byText;

  // A letter, alone or followed by the option text ("D", "(d)", "D.Motor Insurance")
  const m = answer.match(new RegExp(`^[(（]?([${LETTERS}])[)）]?(?:\\s*[.)\\]:\\-။၊]\\s*|\\s+|$)(.*)$`));
  if (m) {
    const rest = m[2].trim();
    if (rest) {
      const t = options.findIndex((o) => loose(o) === loose(rest));
      if (t >= 0) return t; // the text decides when letter and text disagree
    }
    const byLetter = toFiltered(letterIndex(m[1]));
    if (byLetter >= 0) return byLetter;
  }

  // A number 1–6
  if (/^[1-6၁-၆]$/.test(answer)) return toFiltered(digitValue(answer) - 1);

  // The option text with small differences (extra words, punctuation)
  const a = loose(answer);
  const partial = options.findIndex((o) => {
    const b = loose(o);
    return b.length > 3 && (a.includes(b) || b.includes(a));
  });
  return partial;
}

const ANSWER_LIKE = new RegExp(
  `^(?:(?:correct\\s+)?(?:answer|ans)\\s*[:.\\-–=]?\\s*|အဖြေ(?:မှန်)?\\s*[:.\\-–=။]?\\s*)?[(（]?(?:[${LETTERS}]|[1-6၁-၆])[)）]?(?:$|\\s*[.)\\]:\\-။၊]|\\s)`
);

/**
 * Column layout from the data alone (files without a recognisable header):
 * skips a numbering column, the first text column is the question, the
 * column made of letters (A–D / က–ဃ / 1–4) is the answer, the columns in
 * between are the options and the next one is the explanation.
 */
function inferLayout(rows: string[][]): { qCol: number; optCols: number[]; aCol: number; eCol: number } {
  const sample = rows.slice(0, 60);
  const width = Math.max(0, ...sample.map((r) => r.length));
  const share = (col: number, test: (v: string) => boolean) => {
    const vals = sample.map((r) => r[col] || '').filter(Boolean);
    return vals.length ? vals.filter(test).length / vals.length : 0;
  };
  const filled = (col: number) => sample.filter((r) => r[col]).length / Math.max(1, sample.length);

  let qCol = 0;
  while (qCol < width - 1 && (filled(qCol) < 0.3 || share(qCol, (v) => /^[\d၀-၉]{1,4}[.)။]?$/.test(v)) > 0.8)) qCol++;

  let aCol = -1;
  for (let c = width - 1; c > qCol + 1; c--) {
    if (filled(c) >= 0.5 && share(c, (v) => ANSWER_LIKE.test(v) || v.length <= 2) >= 0.7) {
      aCol = c;
      break;
    }
  }
  if (aCol < 0) aCol = Math.min(qCol + 5, width - 1); // Question, A, B, C, D, Answer

  const optCols: number[] = [];
  for (let c = qCol + 1; c < aCol; c++) if (filled(c) > 0) optCols.push(c);
  let eCol = -1;
  for (let c = aCol + 1; c < width; c++)
    if (filled(c) > 0) {
      eCol = c;
      break;
    }
  return { qCol, optCols, aCol, eCol };
}

export interface SpreadsheetQuizResult {
  questions: GeneratedQuestionItem[];
  /** Rows that could not be used, with the reason ("Row 5: no correct answer") */
  problems: string[];
}

export function rowsToQuestions(rows: string[][]): SpreadsheetQuizResult {
  const clean = rows.map((r) => r.map((c) => String(c ?? '').replace(/\s+/g, ' ').trim()));
  const problems: string[] = [];

  // Header row: the first row (within the first 5) that names a question column
  let headerRow = -1;
  for (let i = 0; i < Math.min(5, clean.length); i++) {
    if (clean[i].some((c) => headerKind(c).kind === 'question')) {
      headerRow = i;
      break;
    }
  }
  let qCol = -1;
  let aCol = -1;
  let eCol = -1;
  let optCols: number[] = [];
  if (headerRow >= 0) {
    const opts: { col: number; n: number }[] = [];
    clean[headerRow].forEach((h, col) => {
      const k = headerKind(h);
      if (k.kind === 'question' && qCol < 0) qCol = col;
      else if (k.kind === 'answer' && aCol < 0) aCol = col;
      else if (k.kind === 'explanation' && eCol < 0) eCol = col;
      else if (k.kind === 'option') opts.push({ col, n: k.option! });
    });
    optCols = opts.sort((a, b) => a.n - b.n).map((o) => o.col);
    // Option headers not recognised: the columns between Question and Answer are the options
    if (optCols.length < 2 && qCol >= 0 && aCol > qCol + 2) {
      optCols = [];
      for (let c = qCol + 1; c < aCol; c++) if (c !== eCol) optCols.push(c);
    }
  }
  const data = clean.slice(headerRow + 1).filter((r) => r.some(Boolean));
  if (qCol < 0 || aCol < 0 || optCols.length < 2) {
    // No usable header: work the columns out from the data
    const layout = inferLayout(data);
    if (qCol < 0 || optCols.length < 2) {
      qCol = layout.qCol;
      optCols = layout.optCols;
    }
    if (aCol < 0) aCol = layout.aCol;
    if (eCol < 0) eCol = layout.eCol;
  }

  const questions: GeneratedQuestionItem[] = [];
  for (let r = headerRow + 1; r < clean.length; r++) {
    const row = clean[r];
    if (row.every((c) => !c)) continue;
    const label = `Row ${r + 1}`;
    const question = row[qCol] || '';
    if (!question) {
      problems.push(`${label}: the question is empty.`);
      continue;
    }
    // Keep each option's column position, so "C" still means column C when B is empty.
    // Option cells may start with their letter ("A. Life insurance") — drop it.
    const all = optCols.map((c) => stripOptionLetter(row[c] || ''));
    const options = all.filter(Boolean);
    if (options.length < 2) {
      problems.push(`${label}: needs at least 2 answer options.`);
      continue;
    }
    const answer = (aCol >= 0 ? row[aCol] : '') || '';
    const correct = matchAnswer(answer, all);
    if (correct < 0 || correct >= options.length) {
      problems.push(`${label}: the correct answer "${answer || '(empty)'}" does not match an option (use A, B, C… or the option text).`);
      continue;
    }
    questions.push({ question_text: question, options, correct_option_index: correct, explanation: eCol >= 0 ? row[eCol] || '' : '' });
  }
  return { questions, problems };
}

export async function readQuizSpreadsheet(file: File): Promise<SpreadsheetQuizResult> {
  return rowsToQuestions(await readSpreadsheetRows(file));
}

/** A ready-to-fill template that opens in Excel (CSV with a UTF-8 mark so Myanmar text shows correctly). */
export function quizTemplateCsv(): Blob {
  const rows = [
    ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Explanation'],
    ['What is a premium?', 'The amount paid for insurance cover', 'A claim payment', 'A policy number', 'A tax', 'A', 'The premium is the price of the insurance cover.'],
    ['ပရီမီယံဆိုတာဘာလဲ?', 'အာမခံကြေး', 'လျော်ကြေး', 'ပေါ်လစီနံပါတ်', 'အခွန်', 'A', ''],
  ];
  const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n');
  return new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
}
