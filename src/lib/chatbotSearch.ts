/**
 * Finds the best answer for a question in the assistant's knowledge base.
 * Runs in the browser, no AI service.
 *
 * Works for English and Myanmar:
 * - English: words (with simple stemming) plus character trigrams, so small
 *   typos still match ("benfit" ≈ "benefit").
 * - Myanmar has no spaces between words, so Myanmar text is compared by
 *   overlapping character pairs/triples.
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

const MYANMAR = /[က-႟ꩠ-ꩿꧠ-꧿]/;
const STOPWORDS = new Set(
  'a an the and or of to in on for is are was were be been can could do does did i you we they he she it my your our their this that these those what which who whom how when where why with about from at by as if so please tell me know want need there any some meaning mean means define definition explain explanation describe term terms called'.split(
    ' '
  )
);

/** Myanmar question words / particles, ignored when comparing text */
const MM_PARTICLES = new RegExp(
  [
    'ဘာတွေ', 'ဘာလဲ', 'ဘယ်လို', 'ဘယ်လောက်', 'ဘယ်သူ', 'ဘယ်မှာ', 'ဘယ်အချိန်', 'ဘယ်', 'ဘာ',
    'ဆိုတာ', 'ဆိုသည်မှာ', 'ဖြစ်သလဲ', 'ဖြစ်လဲ', 'ဖြစ်', 'ရမလဲ', 'ရလဲ', 'ရမလား', 'ရလား', 'သလဲ', 'မလဲ', 'လဲ', 'လား',
    'နိုင်', 'လို့', 'ကနေ', 'တွေ', 'များ', 'ရင်', 'ပါသလား', 'ပါ', 'သည်', 'တယ်', 'မယ်', 'ပေးပါ', 'ချင်',
  ].join('|'),
  'g'
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
      // Myanmar: character bigrams and trigrams (no word spaces), without
      // question particles that appear in almost every question
      const core = token.replace(MM_PARTICLES, ' ').replace(/[^\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF ]/g, '');
      for (const part of core.split(' ')) {
        const chars = Array.from(part);
        for (let i = 0; i < chars.length - 1; i++) add('m2:' + chars[i] + chars[i + 1], 0.5);
        for (let i = 0; i < chars.length - 2; i++) add('m3:' + chars[i] + chars[i + 1] + chars[i + 2], 1.5);
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

  search(query: string, limit = 4): SearchHit[] {
    const q = features(query);
    this.correctTypos(q);
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
 * Below this the assistant says it does not know (tuned on sample data).
 * Myanmar text shares many character pairs by chance, so it needs more.
 */
export const minAnswerScore = (query: string) => (isMyanmar(query) ? 0.3 : 0.15);
