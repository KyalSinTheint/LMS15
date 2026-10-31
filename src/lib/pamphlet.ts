/**
 * Splits product knowledge content (lightweight markdown, see
 * ProductRichTextRenderer) into printed-pamphlet style pages.
 *
 * - Every "# " / "## " heading starts a new section on a new page.
 * - Long sections continue on the following page(s) ("continued").
 * - Pages are packed by an approximate text budget; each page body also
 *   scrolls as a safety net, so nothing is ever cut off.
 */

export interface PamphletContentPage {
  /** Section title shown at the top of the page */
  title: string;
  /** Markdown body for this page (without the section heading) */
  body: string;
  /** True when this page continues the previous page's section */
  continued: boolean;
  /** Index of the section this page belongs to (for the table of contents) */
  sectionIndex: number;
}

export interface PamphletSection {
  title: string;
  /** Index of the first content page of the section */
  firstPage: number;
}

const HEADING = /^#{1,2}\s+(.+)$/;
const LIST_LINE = /^([-*•✦▪–]|\d+[.)])\s+/;

/** Rough "visual weight" of a markdown block, in characters. */
function blockCost(block: string): number {
  const lines = block.split('\n');
  const isList = lines.every((l) => LIST_LINE.test(l.trim()) || !l.trim());
  if (isList) return lines.reduce((sum, l) => sum + l.length + 45, 30);
  if (/^###\s/.test(block)) return block.length + 70;
  return block.length + 60;
}

/** Breaks a block that is too big for one page into smaller pieces. */
function splitOversizedBlock(block: string, budget: number): string[] {
  if (blockCost(block) <= budget) return [block];
  const lines = block.split('\n');

  // Lists (or multi-line blocks): split between lines
  if (lines.length > 1) {
    const pieces: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      const candidate = [...current, line].join('\n');
      if (current.length > 0 && blockCost(candidate) > budget) {
        pieces.push(current.join('\n'));
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length) pieces.push(current.join('\n'));
    return pieces.flatMap((p) => (p.split('\n').length === 1 ? splitOversizedBlock(p, budget) : [p]));
  }

  // A single long paragraph: split between sentences
  const sentences = block.match(/[^.!?။]+[.!?။]+["')\]]*\s*|[^.!?။]+$/g) || [block];
  const pieces: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && blockCost(current + sentence) > budget) {
      pieces.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

export function buildPamphletPages(
  content: string,
  options: { budget?: number; untitledSection?: string } = {}
): { pages: PamphletContentPage[]; sections: PamphletSection[] } {
  const budget = options.budget ?? 950;
  const untitled = options.untitledSection ?? 'Product Overview';

  // 1. Group lines into sections by top-level headings
  const rawSections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of (content || '').replace(/\r\n/g, '\n').split('\n')) {
    const heading = line.trim().match(HEADING);
    if (heading) {
      current = { title: heading[1].replace(/\*\*/g, '').trim(), lines: [] };
      rawSections.push(current);
    } else {
      if (!current) {
        if (!line.trim()) continue;
        current = { title: untitled, lines: [] };
        rawSections.push(current);
      }
      current.lines.push(line);
    }
  }

  // 2. Pack each section's blocks into pages
  const pages: PamphletContentPage[] = [];
  const sections: PamphletSection[] = [];

  rawSections.forEach((section) => {
    const blocks = section.lines
      .join('\n')
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean)
      .flatMap((b) => splitOversizedBlock(b, budget - 120));

    if (blocks.length === 0) return;

    const sectionIndex = sections.length;
    sections.push({ title: section.title, firstPage: pages.length });

    let pageBlocks: string[] = [];
    let used = 120; // section title
    let continued = false;

    const flush = () => {
      if (pageBlocks.length === 0) return;
      pages.push({ title: section.title, body: pageBlocks.join('\n\n'), continued, sectionIndex });
      pageBlocks = [];
      used = 90;
      continued = true;
    };

    for (const block of blocks) {
      const cost = blockCost(block);
      if (pageBlocks.length > 0 && used + cost > budget) flush();
      pageBlocks.push(block);
      used += cost;
    }
    flush();
  });

  return { pages, sections };
}
