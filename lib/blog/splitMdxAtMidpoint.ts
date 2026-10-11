import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';

const parser = createProcessor({ remarkPlugins: [remarkGfm] });
/** Insert only between complete top-level MDX nodes, preserving the source byte for byte. */
export function splitMdxAtMidpoint(body: string): { first: string; second: string } {
  if (body.trim().length < 800) return { first: body, second: '' };
  try {
    const tree = parser.parse(body);
    // Imports, exports and reference definitions have document-wide scope. Keep
    // those documents intact rather than compiling fragments with missing scope.
    if (tree.children.some(node => node.type === 'mdxjsEsm' || node.type === 'definition')) return { first: body, second: '' };
    const candidates = tree.children.slice(0, -1)
      .filter(node => node.type !== 'heading')
      .map(node => node.position?.end.offset)
      .filter((offset): offset is number => typeof offset === 'number' && offset > body.length * .25 && offset < body.length * .75);
    const boundary = candidates.sort((a, b) => Math.abs(a - body.length / 2) - Math.abs(b - body.length / 2))[0];
    if (boundary === undefined) return { first: body, second: '' };
    return { first: body.slice(0, boundary), second: body.slice(boundary) };
  } catch {
    // The renderer owns syntax diagnostics; never make invalid MDX worse by
    // guessing where to split an unparseable document.
    return { first: body, second: '' };
  }
}
