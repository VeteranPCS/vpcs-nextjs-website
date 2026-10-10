import { describe, expect, it, vi } from 'vitest';
import { createProcessor } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { splitMdxAtMidpoint } from '../splitMdxAtMidpoint';
vi.mock('server-only',()=>({}));
import { extractTocHeadings } from '../mdx';
const parser=createProcessor({remarkPlugins:[remarkGfm]});
const paragraph='A complete paragraph about planning a military move with a trusted professional. '.repeat(8);
describe('safe MDX promotion boundaries',()=>{
  it.each([
    ['fenced code','```tsx\nconst values = [1, 2];\n\n## This is code\n```'],
    ['loose nested list','- First item\n\n  Details inside this item.\n\n  - Nested item\n\n- Second item'],
    ['GFM table','| Benefit | Details |\n| --- | --- |\n| VA loan | Military benefit |\n| BAH | Housing allowance |'],
    ['JSX block','<Callout title="Important">\n\n## A nested heading\n\nKeep this entire block intact.\n\n</Callout>'],
    ['JSX expression','{[1, 2].map(value => (\n  <span key={value}>\n    {value}\n  </span>\n))}'],
  ])('does not split a %s node',(_label,block)=>{
    const body=`${paragraph}\n\n${block}\n\n${paragraph}\n\n## Next section\n\n${paragraph}`;
    const {first,second}=splitMdxAtMidpoint(body);
    expect(first+second).toBe(body);expect(second).not.toBe('');
    expect(first.includes(block)||second.includes(block)).toBe(true);
    expect(()=>parser.parse(first)).not.toThrow();expect(()=>parser.parse(second)).not.toThrow();
    const boundary=first.length;
    for(const node of parser.parse(body).children) {
      const start=node.position?.start.offset??0,end=node.position?.end.offset??0;
      expect(boundary<=start||boundary>=end).toBe(true);
    }
  });
  it('keeps short, unparseable and document-scoped content intact for after-body promotions',()=>{
    for(const body of ['## Short\n\nA short article.',`${paragraph}\n\n<Broken>${paragraph}`,`import X from './x'\n\n${paragraph}\n\n<X />`,`${paragraph}\n\n[link][scope]\n\n[scope]: /about`])expect(splitMdxAtMidpoint(body)).toEqual({first:body,second:''});
  });
  it('keeps occurrence-aware IDs across duplicate headings in separate fragments',()=>{
    const body=`## Costs\n\n${paragraph}\n\n## Costs\n\n${paragraph}\n\n## Costs\n\n${paragraph}`;
    const split=splitMdxAtMidpoint(body),all=extractTocHeadings(body),count=extractTocHeadings(split.first).length;
    expect([...all.slice(0,count),...all.slice(count)].map(item=>item.id)).toEqual(['costs','costs-2','costs-3']);
  });
  it('preserves every committed article byte and parses each inserted fragment',()=>{
    const directory=path.join(process.cwd(),'content/blog');
    for(const filename of fs.readdirSync(directory).filter(name=>name.endsWith('.mdx'))) {
      const {content}=matter(fs.readFileSync(path.join(directory,filename),'utf8'));
      const {first,second}=splitMdxAtMidpoint(content);
      expect(first+second,filename).toBe(content);
      if(second) {expect(()=>parser.parse(first),filename).not.toThrow();expect(()=>parser.parse(second),filename).not.toThrow();}
    }
  }, 30000);
});
