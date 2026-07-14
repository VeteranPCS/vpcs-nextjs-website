import type { PortableTextBlock } from '@/lib/content/loader';

// Shared semantic extractors for the Portable Text parity tests: a
// hand-transcribed JSX module (rendered via renderToStaticMarkup) is compared
// against the exported Portable Text JSON in content/_data/site/. Consumers:
// about-bios-parity.test.tsx, faq-parity.test.tsx.

export type Semantics = {
  /** Block-level structure in document order: tag kind + normalized text. */
  blocks: { kind: string; text: string }[];
  /** Sorted link hrefs. */
  hrefs: string[];
  /** Normalized texts of strong spans, in document order. */
  strong: string[];
  /** Normalized texts of em spans, in document order. */
  em: string[];
};

const HEADING_STYLES = new Set(['h1', 'h2', 'h3', 'h4']);

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Extracts expected semantics from a Portable Text block array. */
export function semanticsFromPortableText(blocks: PortableTextBlock[]): Semantics {
  const semantics: Semantics = { blocks: [], hrefs: [], strong: [], em: [] };
  for (const block of blocks) {
    const kind = block.listItem === 'bullet'
      ? 'li'
      : HEADING_STYLES.has(block.style) ? block.style : 'p';
    semantics.blocks.push({
      kind,
      text: normalizeText(block.children.map((child) => child.text).join('')),
    });
    for (const child of block.children) {
      if (child.marks.includes('strong')) semantics.strong.push(normalizeText(child.text));
      if (child.marks.includes('em')) semantics.em.push(normalizeText(child.text));
      for (const mark of child.marks) {
        const markDef = block.markDefs.find((def) => def._key === mark);
        if (markDef?.href) semantics.hrefs.push(markDef.href);
      }
    }
  }
  semantics.hrefs.sort();
  return semantics;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ''));
}

/**
 * Extracts observed semantics from renderToStaticMarkup output. The markup is
 * our own (paragraphs, headings, list items, strong/em, anchors), so simple
 * non-greedy tag matching is sufficient - block tags never self-nest.
 */
export function semanticsFromHtml(html: string): Semantics {
  const semantics: Semantics = { blocks: [], hrefs: [], strong: [], em: [] };
  for (const match of html.matchAll(/<(p|h[1-4]|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    // Both capture groups are mandatory in the regex.
    semantics.blocks.push({ kind: match[1]!, text: normalizeText(stripTags(match[2]!)) });
  }
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
    semantics.hrefs.push(decodeEntities(match[1]!)); // mandatory capture group
  }
  for (const match of html.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/g)) {
    semantics.strong.push(normalizeText(stripTags(match[1]!))); // mandatory capture group
  }
  for (const match of html.matchAll(/<em\b[^>]*>([\s\S]*?)<\/em>/g)) {
    semantics.em.push(normalizeText(stripTags(match[1]!))); // mandatory capture group
  }
  semantics.hrefs.sort();
  return semantics;
}
