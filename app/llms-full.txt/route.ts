import { getAllBlogs } from '@/lib/blog/mdx';
import stateService from '@/services/stateService';

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://veteranpcs.com';

function stripMdxComponents(body: string): string {
  return body
    .replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*\/>/g, '')
    .replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*>[\s\S]*?<\/\1>/g, '');
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export async function GET(): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const parts: string[] = [];

  parts.push('# VeteranPCS — Full Content Dump\n');
  parts.push(
    `> Generated ${today}. This file contains every blog post and state-page metadata\n` +
      `> flattened for LLM ingestion. For structured queries, use /api/mcp instead.\n`,
  );

  parts.push('## States\n');
  try {
    const states = await stateService.fetchStateList();
    if (states.length === 0) {
      parts.push('(none)\n');
    } else {
      const lines = states.map((s) => {
        const slug = s.state_slug?.current ?? '';
        const label = s.state_name ?? s.short_name;
        return `- ${label} (${s.short_name}) — slug: ${slug} — ${BASE_URL}/${slug}/llms.txt`;
      });
      parts.push(lines.join('\n') + '\n');
    }
  } catch {
    parts.push('(unavailable)\n');
  }

  const blogs = await getAllBlogs();
  parts.push(`## Blog Posts (${blogs.length} total)\n`);

  for (const post of blogs) {
    const url = `${BASE_URL}/blog/${post.slug}`;
    const categories = (post.categories ?? []).join(', ') || '—';
    const section: string[] = [];
    section.push(`### ${post.title}\n`);
    section.push(`- URL: ${url}`);
    section.push(`- Raw markdown: ${url}/page.md`);
    section.push(`- Published: ${formatDate(post.publishedAt)}  Updated: ${formatDate(post.updatedAt)}`);
    section.push(`- Categories: ${categories}`);
    if (post.primaryKeyword) section.push(`- Primary keyword: ${post.primaryKeyword}`);
    section.push('');
    section.push(stripMdxComponents(post.content).trim());
    section.push('\n---\n');
    parts.push(section.join('\n'));
  }

  return new Response(parts.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
