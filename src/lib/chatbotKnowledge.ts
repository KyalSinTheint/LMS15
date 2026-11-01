/**
 * Builds the assistant's searchable knowledge from:
 * - entries ingested from PDFs / written by admins (chatbot_entries)
 * - published Product Knowledge Hub content, split by its headings
 */
import type { ProductKnowledgeItem } from '../types/lms';
import type { ChatbotEntry } from './chatbotApi';
import type { KnowledgeItem } from './chatbotSearch';
import { buildPamphletPages } from './pamphlet';
import { getProductRichContent } from './productKnowledgeUtils';

/** Plain text for search and display (drops Markdown symbols and images). */
export const plainText = (md: string) =>
  (md || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•✦▪–]\s+/gm, '• ')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, '$1')
    .replace(/\\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ---------------------------------------------------------------------
// PDFs made with non-Unicode Myanmar fonts give scrambled Myanmar text
// (signs split from their letters: "ဖေင ်", "ခ ိုင်"). Such text can't be
// searched or read, so it is hidden and the (correct) English is kept.
// ---------------------------------------------------------------------
const MM_CHAR = /[\u1000-\u109F]/g;
const BROKEN_SIGNS = [
  /\s[\u102B-\u103E]/g, // a vowel sign / medial / asat after a space
  /(^|[^\u1000-\u109F])[\u102B-\u103E]/g, // a sign with no letter before it
  /\u1031(?=\s|$)/g, // "ေ" left alone at the end of a word
];

export function hasBrokenMyanmar(text: string): boolean {
  const mm = (text.match(MM_CHAR) || []).length;
  if (mm < 10) return false;
  const anomalies = BROKEN_SIGNS.reduce((n, re) => n + (text.match(re) || []).length, 0);
  return anomalies >= 2 && anomalies / mm > 0.01;
}

/** Removes scrambled Myanmar from extracted text, keeping everything else. */
export function stripBrokenMyanmar(text: string): string {
  if (!hasBrokenMyanmar(text)) return text;
  return text
    .replace(/\([^()]*[\u1000-\u109F][^()]*\)/g, ' ') // "(… Myanmar translation …)"
    .replace(/[\u1000-\u109F][\u1000-\u109F\s\d.,;:%/–\-()]*/g, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\(([^()]*)$/, '$1') // a "(" whose closing part was removed
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function buildKnowledge(
  entries: (ChatbotEntry & { document_title?: string | null })[],
  products: ProductKnowledgeItem[]
): KnowledgeItem[] {
  const items: KnowledgeItem[] = entries
    .map((e) => ({ ...e, content: stripBrokenMyanmar(e.content), title: e.title ? stripBrokenMyanmar(e.title) : e.title }))
    .filter((e) => e.content.length >= 15 || e.kind === 'faq')
    .map((e) => ({
    id: e.id,
    kind: e.kind,
    question: e.question,
    title: e.title,
    content: e.content,
    page: e.page,
    source: e.document_title ? `${e.document_title}${e.page ? ` · p.${e.page}` : ''}` : 'LMS FAQ',
  }));

  for (const product of products) {
    const content = (product.content && product.content.trim()) || getProductRichContent(product);
    const { pages } = buildPamphletPages(content);
    pages.forEach((page, i) => {
      const text = plainText(page.body);
      if (text.length < 15) return;
      items.push({
        id: `product:${product.id}:${i}`,
        kind: 'product',
        title: `${product.title} — ${page.title}`,
        content: text,
        source: `${product.title} (Product Knowledge Hub)`,
        productId: product.id,
      });
    });
  }
  return items;
}
