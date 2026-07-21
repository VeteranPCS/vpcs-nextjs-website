import { describe, expect, it } from 'vitest';
import type { PortableTextBlock } from '@/lib/content/loader';
import { semanticsFromHtml, semanticsFromPortableText } from './portable-text-semantics';

// Fixture checks for the list-structure model in portable-text-semantics.ts:
// list container kinds (ul vs ol), container boundaries, and nested levels
// must round-trip identically through both extractors.

function block(
  text: string,
  options: { listItem?: string; level?: number; style?: string } = {},
): PortableTextBlock {
  return {
    _key: `k-${text}`,
    _type: 'block',
    style: options.style ?? 'normal',
    children: [{ _key: `s-${text}`, _type: 'span', marks: [], text }],
    markDefs: [],
    listItem: options.listItem,
    level: options.level,
  };
}

describe('portable-text-semantics list structure', () => {
  it('distinguishes ul (bullet) from ol (number) containers', () => {
    const bullets = semanticsFromPortableText([
      block('one', { listItem: 'bullet', level: 1 }),
      block('two', { listItem: 'bullet', level: 1 }),
    ]);
    const numbers = semanticsFromPortableText([
      block('one', { listItem: 'number', level: 1 }),
      block('two', { listItem: 'number', level: 1 }),
    ]);
    expect(bullets.blocks).toEqual([
      { kind: 'ul', items: [{ text: 'one', children: [] }, { text: 'two', children: [] }] },
    ]);
    expect(numbers.blocks).toEqual([
      { kind: 'ol', items: [{ text: 'one', children: [] }, { text: 'two', children: [] }] },
    ]);
    expect(bullets).not.toEqual(numbers);
    expect(semanticsFromHtml('<ul><li>one</li><li>two</li></ul>')).toEqual(bullets);
    expect(semanticsFromHtml('<ol><li>one</li><li>two</li></ol>')).toEqual(numbers);
    expect(semanticsFromHtml('<ol><li>one</li><li>two</li></ol>')).not.toEqual(bullets);
  });

  it('does not merge two lists separated by a paragraph', () => {
    const expected = semanticsFromPortableText([
      block('one', { listItem: 'bullet', level: 1 }),
      block('two', { listItem: 'bullet', level: 1 }),
      block('between'),
      block('three', { listItem: 'bullet', level: 1 }),
    ]);
    expect(expected.blocks).toEqual([
      { kind: 'ul', items: [{ text: 'one', children: [] }, { text: 'two', children: [] }] },
      { kind: 'p', text: 'between' },
      { kind: 'ul', items: [{ text: 'three', children: [] }] },
    ]);
    expect(
      semanticsFromHtml('<ul><li>one</li><li>two</li></ul><p>between</p><ul><li>three</li></ul>'),
    ).toEqual(expected);
    expect(
      semanticsFromHtml('<ul><li>one</li><li>two</li><li>three</li></ul><p>between</p>'),
    ).not.toEqual(expected);
  });

  it('nests a level-2 item inside the preceding level-1 item', () => {
    const expected = semanticsFromPortableText([
      block('parent', { listItem: 'bullet', level: 1 }),
      block('nested', { listItem: 'bullet', level: 2 }),
      block('sibling', { listItem: 'bullet', level: 1 }),
    ]);
    expect(expected.blocks).toEqual([
      {
        kind: 'ul',
        items: [
          {
            text: 'parent',
            children: [{ kind: 'ul', items: [{ text: 'nested', children: [] }] }],
          },
          { text: 'sibling', children: [] },
        ],
      },
    ]);
    expect(
      semanticsFromHtml(
        '<ul><li>parent<ul><li>nested</li></ul></li><li>sibling</li></ul>',
      ),
    ).toEqual(expected);
    expect(
      semanticsFromHtml('<ul><li>parent</li><li>nested</li><li>sibling</li></ul>'),
    ).not.toEqual(expected);
  });
});
