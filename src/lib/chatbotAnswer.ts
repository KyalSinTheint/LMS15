/**
 * Builds the assistant's reply from the best search results, without an AI
 * service:
 * - a handbook section is split into sentences (English, with the Myanmar
 *   translation that follows it in brackets);
 * - the sentences closest to the question are picked, in document order;
 * - the reply is in the question's language, with the other language
 *   available below it;
 * - a second, different section that also fits well adds a short
 *   "also" point, so the answer covers the topic more fully.
 * Facts are always quoted from the approved material, never invented.
 */
import { definesTerm, definitionTerms, features, KnowledgeIndex, SearchHit, KnowledgeItem } from './chatbotSearch';

const MM = /[က-႟]/;
const MM_PAREN = /(\([^()]*[က-႟][^()]*\))/;

export interface Unit {
  en: string;
  mm: string;
}

const clean = (t: string) =>
  t
    .replace(/^[\s)）;,:\-–]+/, '')
    .replace(/^\s*[(（]\s*|\s*[)）]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** English sentences, each with the Myanmar translation that follows it. */
export function splitUnits(content: string): Unit[] {
  const units: Unit[] = [];
  for (const part of content.split(MM_PAREN)) {
    if (!part.trim()) continue;
    if (MM_PAREN.test(part)) {
      const mm = clean(part);
      if (units.length && !units[units.length - 1].mm) units[units.length - 1].mm = mm;
      else units.push({ en: '', mm });
      continue;
    }
    // Plain text: English sentences and loose Myanmar
    const pieces = part.match(/[က-႟][^A-Za-z]*[က-႟။]|[^က-႟]+/g) || [];
    for (const piece of pieces) {
      if (MM.test(piece)) {
        const mm = clean(piece);
        if (units.length && !units[units.length - 1].mm) units[units.length - 1].mm = mm;
        else units.push({ en: '', mm });
      } else {
        const sentences = piece.match(/[^.!?]+(?:[.!?]+|$)/g) || [];
        for (const s of sentences) {
          const en = clean(s);
          if (en.replace(/[^A-Za-z]/g, '').length >= 3) units.push({ en, mm: '' });
        }
      }
    }
  }
  return units.filter((u) => u.en || u.mm);
}

export interface ComposedAnswer {
  /** Main answer, in the question's language when available */
  text: string;
  /** The same answer in the other language (English original / Myanmar) */
  alt?: string;
  /** Short extra points from other matching sections */
  points: { title: string; text: string; item: KnowledgeItem }[];
}

function unitScore(unit: Unit, q: Map<string, number>, index: KnowledgeIndex, defTerms: string[] | null): number {
  const f = features(`${unit.en} ${unit.mm}`);
  let s = 0;
  for (const [k, w] of q) if (f.has(k)) s += w * index.weight(k);
  // "What is X?": the sentence that defines X comes first
  if (defTerms && (definesTerm(unit.en, defTerms) || definesTerm(unit.mm, defTerms))) s = s * 2 + 10;
  return s;
}

/** Picks the sentences of one item that answer the question best. */
function bestUnits(
  item: KnowledgeItem,
  q: Map<string, number>,
  index: KnowledgeIndex,
  maxChars: number,
  defTerms: string[] | null
): Unit[] {
  const units = splitUnits(item.content);
  if (units.length <= 2) return units;
  const scored = units.map((u, i) => ({ u, i, s: unitScore(u, q, index, defTerms) }));
  const top = [...scored].sort((a, b) => b.s - a.s);
  if (top[0].s <= 0) return units.slice(0, 2);
  const keep = new Set<number>([top[0].i]);
  // A definition often continues in the next sentence
  if (top[0].i + 1 < units.length) keep.add(top[0].i + 1);
  for (const t of top.slice(1)) {
    if (t.s < top[0].s * 0.5) break;
    keep.add(t.i);
  }
  const picked: Unit[] = [];
  let len = 0;
  for (const i of [...keep].sort((a, b) => a - b)) {
    const u = units[i];
    const l = Math.max(u.en.length, u.mm.length);
    if (picked.length && len + l > maxChars) break;
    picked.push(u);
    len += l;
  }
  return picked;
}

const joinLang = (units: Unit[], lang: 'en' | 'mm') =>
  units
    .map((u) => u[lang])
    .filter(Boolean)
    .join(lang === 'en' ? ' ' : '\n');

export function composeAnswer(
  question: string,
  hits: SearchHit[],
  index: KnowledgeIndex,
  lang: 'en' | 'my'
): ComposedAnswer {
  const q = index.queryFeatures(question);
  const defTerms = definitionTerms(question);
  const best = hits[0].item;

  let text: string;
  let alt: string | undefined;
  if (best.kind === 'section') {
    const units = bestUnits(best, q, index, 650, defTerms);
    const en = joinLang(units, 'en');
    const mm = joinLang(units, 'mm');
    if (lang === 'my') {
      text = mm || en;
      alt = mm && en ? en : undefined;
    } else {
      text = en || mm;
      alt = en && mm ? mm : undefined;
    }
  } else {
    text = best.content;
  }

  // Other sections that also fit the question well add one short point each
  const points: ComposedAnswer['points'] = [];
  const seenTitles = new Set([best.title || best.question || '']);
  for (const h of hits.slice(1)) {
    if (points.length >= 2 || h.score < hits[0].score * 0.75) break;
    const item = h.item;
    const key = item.title || item.question || '';
    if (seenTitles.has(key) || item.kind !== 'section') continue;
    seenTitles.add(key);
    const units = bestUnits(item, q, index, 260, defTerms).slice(0, 1);
    // Extra points stay in the question's language
    const pointText = lang === 'my' ? units[0]?.mm : units[0]?.en;
    if (pointText && !text.includes(pointText)) points.push({ title: item.title || 'Handbook', text: pointText, item });
  }
  return { text, alt, points };
}
