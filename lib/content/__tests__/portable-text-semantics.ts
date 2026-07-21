import type { PortableTextBlock } from '@/lib/content/loader';

// Shared semantic extractors for the Portable Text parity tests: a
// hand-transcribed JSX module (rendered via renderToStaticMarkup) is compared
// against the exported Portable Text JSON in content/_data/site/. Consumers:
// about-bios-parity.test.tsx, faq-parity.test.tsx,
// support-veterence-parity.test.tsx, how-it-works-parity.test.tsx.
//
// List structure is preserved, not flattened: consecutive sibling blocks
// sharing a listItem type group into a list container (`ul` for "bullet",
// `ol` for "number"), and nested `level` values produce nested containers,
// mirroring the <ul>/<ol>/<li> tree the JSX side renders.

export type SemanticListItem = {
  /** Normalized text of the item itself, excluding nested list content. */
  text: string;
  /** Nested list containers inside this item, in document order. */
  children: SemanticList[];
};

export type SemanticList = {
  kind: 'ul' | 'ol';
  items: SemanticListItem[];
};

export type SemanticBlock =
  | { kind: string; text: string } // p, h1-h4
  | SemanticList;

export type Semantics = {
  /** Block-level structure in document order: paragraphs/headings + list containers. */
  blocks: SemanticBlock[];
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
  // Open list containers by nesting depth: listStack[level - 1] receives items
  // for that level. Cleared by any non-list block.
  const listStack: SemanticList[] = [];
  for (const block of blocks) {
    const text = normalizeText(block.children.map((child) => child.text).join(''));
    if (block.listItem) {
      const kind: 'ul' | 'ol' = block.listItem === 'number' ? 'ol' : 'ul';
      const level = block.level ?? 1;
      // Close any lists nested deeper than this item.
      listStack.length = Math.min(listStack.length, level);
      // A different list type at the same level starts a sibling container.
      if (listStack.length === level && listStack[level - 1]?.kind !== kind) {
        listStack.length = level - 1;
      }
      // Open containers until one exists at this item's level.
      while (listStack.length < level) {
        const list: SemanticList = { kind, items: [] };
        const parent = listStack[listStack.length - 1];
        if (parent) {
          // Nested lists attach to the parent's most recent item (synthesizing
          // an empty host item if the export skips a level).
          let host = parent.items[parent.items.length - 1];
          if (!host) {
            host = { text: '', children: [] };
            parent.items.push(host);
          }
          host.children.push(list);
        } else {
          semantics.blocks.push(list);
        }
        listStack.push(list);
      }
      // The while loop above guarantees listStack.length >= level.
      listStack[level - 1]!.items.push({ text, children: [] });
    } else {
      listStack.length = 0;
      const kind = HEADING_STYLES.has(block.style) ? block.style : 'p';
      semantics.blocks.push({ kind, text });
    }
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
 * our own (paragraphs, headings, ul/ol/li trees, strong/em, anchors), so a
 * simple token scan over the block-level tags is sufficient - inline tags are
 * treated as text markup and stripped from block text. A bare <li> outside a
 * <ul>/<ol> container is deliberately dropped so the parity comparison fails
 * loudly instead of masking the missing list wrapper.
 */
export function semanticsFromHtml(html: string): Semantics {
  const semantics: Semantics = { blocks: [], hrefs: [], strong: [], em: [] };
  const listStack: SemanticList[] = [];
  const itemStack: { item: SemanticListItem; buffer: string[] }[] = [];
  let blockBuffer: { kind: string; parts: string[] } | null = null;
  for (const token of html.match(/<[^>]+>|[^<]+/g) ?? []) {
    if (token.startsWith('<')) {
      const tagMatch = /^<(\/?)(p|h[1-4]|ul|ol|li)\b/.exec(token);
      if (!tagMatch) continue; // inline tag (a/strong/em/...): stripped from block text
      const closing = tagMatch[1] === '/';
      const tag = tagMatch[2]!; // mandatory capture group
      if (tag === 'ul' || tag === 'ol') {
        if (closing) {
          listStack.pop();
        } else {
          const list: SemanticList = { kind: tag, items: [] };
          const hostItem = itemStack[itemStack.length - 1];
          if (hostItem) hostItem.item.children.push(list);
          else semantics.blocks.push(list);
          listStack.push(list);
        }
      } else if (tag === 'li') {
        if (closing) {
          const entry = itemStack.pop();
          if (entry) entry.item.text = normalizeText(entry.buffer.join(''));
        } else {
          const item: SemanticListItem = { text: '', children: [] };
          const list = listStack[listStack.length - 1];
          if (list) list.items.push(item); // bare <li> with no container: dropped (see doc comment)
          itemStack.push({ item, buffer: [] });
        }
      } else if (closing) {
        if (blockBuffer) {
          semantics.blocks.push({
            kind: blockBuffer.kind,
            text: normalizeText(blockBuffer.parts.join('')),
          });
          blockBuffer = null;
        }
      } else {
        blockBuffer = { kind: tag, parts: [] };
      }
    } else {
      const text = decodeEntities(token);
      if (blockBuffer) {
        blockBuffer.parts.push(text);
      } else {
        const entry = itemStack[itemStack.length - 1];
        if (entry) entry.buffer.push(text);
      }
    }
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
