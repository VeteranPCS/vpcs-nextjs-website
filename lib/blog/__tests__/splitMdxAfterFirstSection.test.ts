import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';
import { splitMdxAfterFirstSection } from '../splitMdxAfterFirstSection';
import { splitMdxAtMidpoint } from '../splitMdxAtMidpoint';

const parser = createProcessor({ remarkPlugins: [remarkGfm] });
const paragraph = 'A complete paragraph about planning a military move. '.repeat(6).trim();

describe('splitMdxAfterFirstSection', () => {
  it('splits just before the second section heading', () => {
    const body = `${paragraph}\n\n## First\n\n${paragraph}\n\n## Second\n\n${paragraph}\n\n## Third\n\n${paragraph}`;
    const { first, second } = splitMdxAfterFirstSection(body);
    expect(first + second).toBe(body);
    expect(first.trimEnd().endsWith(paragraph)).toBe(true);
    expect(first).toContain('## First');
    expect(second.startsWith('## Second')).toBe(true);
  });

  it('falls back to just before the first heading when there is only one', () => {
    const body = `${paragraph}\n\n## Only section\n\n${paragraph}`;
    const { first, second } = splitMdxAfterFirstSection(body);
    expect(first + second).toBe(body);
    expect(second.startsWith('## Only section')).toBe(true);
  });

  it('ignores deeper headings and headings inside code or JSX blocks', () => {
    const body = `${paragraph}\n\n### Not a section\n\n\`\`\`md\n## In code\n\`\`\`\n\n<Callout>\n\n## In a callout\n\n</Callout>\n\n## Real section\n\n${paragraph}`;
    const { second } = splitMdxAfterFirstSection(body);
    expect(second.startsWith('## Real section')).toBe(true);
  });

  it('leaves the body whole when no split would leave content above the block', () => {
    for (const body of [
      '',
      paragraph,
      `## Starts with a heading\n\n${paragraph}`,
      `import X from './x'\n\n${paragraph}\n\n## Section\n\n<X />`,
      `${paragraph}\n\n## Section\n\n[link][scope]\n\n[scope]: /about`,
      `${paragraph}\n\n<Broken>\n\n## Section`,
    ]) {
      expect(splitMdxAfterFirstSection(body)).toEqual({ first: body, second: '' });
    }
  });

  it('uses the second heading when the body starts with one', () => {
    const body = `## First\n\n${paragraph}\n\n## Second\n\n${paragraph}`;
    expect(splitMdxAfterFirstSection(body).second.startsWith('## Second')).toBe(true);
  });

  it('preserves every committed article and yields parseable fragments', () => {
    const directory = path.join(process.cwd(), 'content/blog');
    let split = 0;
    for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith('.mdx'))) {
      const { content } = matter(fs.readFileSync(path.join(directory, filename), 'utf8'));
      const lead = splitMdxAtMidpoint(content).first;
      const { first, second } = splitMdxAfterFirstSection(lead);
      expect(first + second, filename).toBe(lead);
      if (!second) continue;
      split += 1;
      expect(first.trim(), filename).not.toBe('');
      expect(second.startsWith('## '), filename).toBe(true);
      expect(() => parser.parse(first), filename).not.toThrow();
      expect(() => parser.parse(second), filename).not.toThrow();
    }
    expect(split).toBeGreaterThan(300);
  }, 60000);
});
