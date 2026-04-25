export function splitMdxAtMidpoint(body: string): { first: string; second: string } {
  const blocks = body.split(/\n{2,}/).filter((b) => b.length > 0);
  if (blocks.length <= 1) return { first: body, second: '' };
  const mid = Math.ceil(blocks.length / 2);
  return {
    first: blocks.slice(0, mid).join('\n\n'),
    second: blocks.slice(mid).join('\n\n'),
  };
}
