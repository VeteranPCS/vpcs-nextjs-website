import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';

const parser = createProcessor({ remarkPlugins: [remarkGfm] });

/**
 * Split a body fragment just before its second top-level `##` heading (after the
 * intro and first section), falling back to just before the first one. The source
 * is preserved byte for byte; without a usable heading nothing is split.
 */
export function splitMdxAfterFirstSection(body: string): { first: string; second: string } {
  const intact = { first: body, second: '' };
  if (!body.trim()) return intact;
  try {
    const tree = parser.parse(body);
    // Same scope rule as splitMdxAtMidpoint: never compile fragments that lose
    // document-wide imports, exports or reference definitions.
    if (tree.children.some(node => node.type === 'mdxjsEsm' || node.type === 'definition')) return intact;
    const sectionStarts = tree.children
      .filter(node => node.type === 'heading' && node.depth === 2)
      .map(node => node.position?.start.offset)
      .filter((offset): offset is number => typeof offset === 'number' && offset > 0);
    const boundary = sectionStarts[1] ?? sectionStarts[0];
    if (boundary === undefined || !body.slice(0, boundary).trim()) return intact;
    return { first: body.slice(0, boundary), second: body.slice(boundary) };
  } catch {
    return intact;
  }
}
