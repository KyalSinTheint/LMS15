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

export function buildKnowledge(
  entries: (ChatbotEntry & { document_title?: string | null })[],
  products: ProductKnowledgeItem[]
): KnowledgeItem[] {
  const items: KnowledgeItem[] = entries.map((e) => ({
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
