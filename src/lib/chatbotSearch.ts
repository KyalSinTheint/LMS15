/**
 * Finds the best answer for a question in the assistant's knowledge base.
 * Runs in the browser, no AI service.
 *
 * Works for English and Myanmar:
 * - English: words (with simple stemming) plus character trigrams, so small
 *   typos still match ("benfit" ≈ "benefit").
 * - Myanmar has no spaces between words, so Myanmar text is split into
 *   syllables and compared by syllables and syllable pairs. Myanmar
 *   questions are also rewritten to written style and get English terms
 *   (see chatbotMyanmar.ts), so they find English material too.
 * Scores use TF-IDF cosine similarity; words that appear everywhere count less.
 */

export interface KnowledgeItem {
  id: string;
  kind: 'faq' | 'section' | 'product';
  /** FAQ question (faq) */
  question?: string | null;
  /** Section heading or product name */
  title?: string | null;
  content: string;
  /** Where the answer comes from, shown to the employee */
  source: string;
  page?: number | null;
  productId?: string;
}

export interface SearchHit {
  item: KnowledgeItem;
  score: number;
}

import { expandMyanmarQuery, glossaryTerms, MM_STOP, syllables } from './chatbotMyanmar';

const MYANMAR = /[က-႟ꩠ-ꩿꧠ-꧿]/;
const STOPWORDS = new Set(
  'a an the and or of to in on for is are was were be been can could do does did i you we they he she it my your our their this that these those what which who whom how when where why with about from at by as if so please tell me know want need there any some meaning mean means define definition explain explanation describe term terms called'.split(
    ' '
  )
);

const stem = (w: string) =>
  w.length > 4 ? w.replace(/(ings?|ed|es|s)$/, '') : w;

export function normalize(text: string): string {
  return (text || '')
    .normalize('NFC')
    .replace(/[​-‍﻿]/g, '')
    .toLowerCase()
    .replace(/[!-/:-@[-`{-~။၊“”‘’…•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Feature → weight for one text. */
export function features(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const add = (f: string, w: number) => out.set(f, (out.get(f) || 0) + w);
  for (const token of normalize(text).split(' ')) {
    if (!token) continue;
    if (MYANMAR.test(token)) {
      // Myanmar: syllables and syllable pairs; grammar syllables (သည်, ပါ, ကို…)
      // only count as part of a pair
      const syl = syllables(token);
      for (let i = 0; i < syl.length; i++) {
        const stop = MM_STOP.has(syl[i]);
        if (!stop) add('s:' + syl[i], 1);
        if (i + 1 < syl.length && !(stop && MM_STOP.has(syl[i + 1]))) add('s2:' + syl[i] + syl[i + 1], 1.6);
      }
      continue;
    }
    if (STOPWORDS.has(token) || token.length < 2) continue;
    const w = stem(token);
    add('w:' + w, 2);
    // character trigrams for typo tolerance
    const padded = `_${w}_`;
    for (let i = 0; i < padded.length - 2; i++) add('t:' + padded.slice(i, i + 3), 0.35);
  }
  return out;
}

/**
 * "What is X?" / "X ဆိုတာဘာလဲ" questions: the term being asked about, plus
 * its English names when the question is in Myanmar. Null for other questions.
 */
export function definitionTerms(question: string): string[] | null {
  const q = question.trim().replace(/[?？!။]+$/, '').trim();
  let term: string | null = null;
  const en =
    q.match(/^(?:what|whats|what's)\s+(?:is|are|does)\s+(?:an?\s+|the\s+)?(.+?)(?:\s+mean)?$/i) ||
    q.match(/^(?:define|explain|describe)\s+(?:an?\s+|the\s+)?(.+)$/i) ||
    q.match(/^(?:meaning|definition)\s+of\s+(?:an?\s+|the\s+)?(.+)$/i) ||
    q.match(/^(.+?)\s+(?:meaning|definition|means)$/i);
  if (en) term = en[1];
  const my = q.match(/^(.+?)\s*(?:ဆိုတာ|ဆိုသည်မှာ|ဆိုသည်|ဟူသည်|ဟာ|က)\s*(?:ဘာ|ဘယ်|အဘယ်|မည်သည်).*$/);
  if (!term && my) term = my[1];
  if (!term || term.length > 60) return null;
  term = term.trim();
  const terms = [term];
  if (isMyanmar(term)) for (const t of glossaryTerms(term)) terms.push(t);
  return terms;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Does this text define one of the terms ("Premium is …", "ပရီမီယံဆိုသည်မှာ …")? */
export const definesTerm = (text: string, terms: string[]) => definitionStrength(text, terms) > 0;

/** 2 = a clear definition ("X means", "X can be defined", "X ဆိုသည်မှာ"), 1 = "X is …", 0 = none. */
export function definitionStrength(text: string, terms: string[]): number {
  let best = 0;
  for (const t of terms) best = Math.max(best, termStrength(text, t));
  return best;
}

function termStrength(text: string, t: string): number {
  {
    if (!t) return 0;
    if (isMyanmar(t)) return +new RegExp('(?:^|[(။၊:]\\s*)' + escapeRe(t) + '\\s*(?:ဆိုသည်မှာ|ဟူသည်|ဆိုသည်)').test(text) ? 2 : 0;
    const words = t.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (!words.length) return 0;
    const stemmed = words.map((w) => escapeRe(w.replace(/s$/, '')) + 's?').join('\\s+');
    // "Insurance can be defined as …" anywhere (capitalised term, defining verb)
    const cap = escapeRe(t.charAt(0).toUpperCase()) + stemmed.slice(escapeRe(t.charAt(0).toLowerCase()).length);
    if (new RegExp(`\\b${cap}\\b\\s*(?:\\([^)]{0,60}\\)\\s*)?(?:can be defined|may be defined|is defined|means|refers to)\\b`).test(text)) return 2;
    // "… Premium is …" at the start of a sentence
    return new RegExp(`(?:^|[.!?:;(]\\s*|\\n)(?:an?\\s+|the\\s+)?${stemmed}\\b\\s*(?:\\([^)]{0,60}\\)\\s*)?(?:is|are|means|refers to|can be defined|is defined|may be defined)\\b`, 'i').test(text) ? 1 : 0;
  }
}

const QUIZ = /\b(which of the (below|following)|all of the above|none of the above|answer keys?)\b|(?:^|\s)[A-D][.)]\s.{2,120}\s[B-D][.)]\s/i;

interface IndexedItem {
  item: KnowledgeItem;
  vector: Map<string, number>;
  norm: number;
}

export class KnowledgeIndex {
  private items: IndexedItem[] = [];
  private idf = new Map<string, number>();

  constructor(knowledge: KnowledgeItem[]) {
    const raw = knowledge.map((item) => {
      const f = new Map<string, number>();
      const merge = (text: string | null | undefined, weight: number) => {
        if (!text) return;
        for (const [k, v] of features(text)) f.set(k, (f.get(k) || 0) + v * weight);
      };
      // The question / heading says what the entry is about: weigh it more
      merge(item.question, 3);
      merge(item.title, 1.6);
      merge(item.content, 1);
      return { item, f };
    });

    const df = new Map<string, number>();
    for (const { f } of raw) for (const k of f.keys()) df.set(k, (df.get(k) || 0) + 1);
    const n = Math.max(1, raw.length);
    for (const [k, d] of df) this.idf.set(k, Math.log(1 + n / d));

    this.items = raw.map(({ item, f }) => {
      const vector = new Map<string, number>();
      let sum = 0;
      for (const [k, v] of f) {
        const w = (1 + Math.log(v)) * (this.idf.get(k) || 0);
        vector.set(k, w);
        sum += w * w;
      }
      return { item, vector, norm: Math.sqrt(sum) || 1 };
    });
  }

  get size() {
    return this.items.length;
  }

  /** Known English words, for correcting small typos in questions */
  private vocabulary: string[] | null = null;

  private correctTypos(q: Map<string, number>) {
    if (!this.vocabulary) this.vocabulary = [...this.idf.keys()].filter((k) => k.startsWith('w:')).map((k) => k.slice(2));
    for (const [k, v] of [...q]) {
      if (!k.startsWith('w:') || this.idf.has(k)) continue;
      const word = k.slice(2);
      if (word.length < 4) continue;
      const maxDist = word.length >= 7 ? 2 : 1;
      let best: string | null = null;
      let bestDist = maxDist + 1;
      for (const candidate of this.vocabulary) {
        if (Math.abs(candidate.length - word.length) > maxDist) continue;
        const d = editDistance(word, candidate, maxDist);
        if (d < bestDist) {
          bestDist = d;
          best = candidate;
        }
      }
      if (best) {
        q.delete(k); // the misspelt word is replaced by the known one
        q.set('w:' + best, (q.get('w:' + best) || 0) + v * 0.8);
      }
    }
  }

  /** Inverse document frequency of a feature (0 when unknown). */
  weight(feature: string): number {
    return this.idf.get(feature) || 0;
  }

  /** The question's features, as used for searching (typos corrected). */
  queryFeatures(query: string): Map<string, number> {
    const q = features(isMyanmar(query) ? expandMyanmarQuery(query) : query);
    this.correctTypos(q);
    return q;
  }

  search(query: string, limit = 4): SearchHit[] {
    const q = this.queryFeatures(query);
    if (q.size === 0) return [];
    const qv = new Map<string, number>();
    let qsum = 0;
    // Words the knowledge base has never seen still count in the question's
    // length, so "discount for KBZ staff" doesn't match on "KBZ" alone.
    const unseenIdf = Math.log(1 + Math.max(1, this.items.length));
    for (const [k, v] of q) {
      const idf = this.idf.get(k);
      const w = (1 + Math.log(v)) * (idf ?? (k.startsWith('w:') ? unseenIdf : 0));
      if (idf) qv.set(k, w);
      qsum += w * w;
    }
    if (qv.size === 0) return [];
    const qnorm = Math.sqrt(qsum);
    const defTerms = definitionTerms(query);

    const hits: SearchHit[] = [];
    for (const entry of this.items) {
      let dot = 0;
      for (const [k, w] of qv) {
        const v = entry.vector.get(k);
        if (v) dot += w * v;
      }
      if (dot <= 0) continue;
      let score = dot / (qnorm * entry.norm);
      if (entry.item.kind === 'faq') score *= 1.15; // curated answers first
      // Practice-test questions ("Which of the below…") are not answers
      if (QUIZ.test(entry.item.content)) score *= 0.6;
      // "What is X?": the passage that defines X wins
      if (defTerms) {
        score += [0, 0.2, 0.32][definitionStrength(entry.item.content, defTerms)];
        const title = (entry.item.title || entry.item.question || '').toLowerCase();
        if (defTerms.some((t) => title === t.toLowerCase())) score += 0.1;
        // "Concept of insurance", "Definition of premium" …
        else if (defTerms.some((t) => new RegExp(`\\b(concept|definition|meaning|what is)\\s+(of\\s+)?(an?\\s+|the\\s+)?${escapeRe(t.toLowerCase())}\\b`).test(title))) score += 0.15;
      }
      hits.push({ item: entry.item, score });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }
}

/** Levenshtein distance, giving up early once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export const isMyanmar = (text: string) => MYANMAR.test(text);

/**
 * Below this the assistant says it does not know (tuned on the licensing
 * handbook and sample FAQs).
 */
export const minAnswerScore = (query: string) => (isMyanmar(query) ? 0.16 : 0.15);
