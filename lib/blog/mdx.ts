import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { cache } from 'react';
import type { BlogFrontmatter, BlogPost } from '@/lib/blog/types';
import { getBlogComponentBySlug, normalizeBlogComponentSlug } from '@/lib/blog/components';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');
export const BLOG_CATEGORY_PAGE_SIZE = 12;

function readAllFromDisk(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const entries = fs.readdirSync(CONTENT_DIR);
  const posts: BlogPost[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.mdx')) continue;
    const filepath = path.join(CONTENT_DIR, entry);
    const raw = fs.readFileSync(filepath, 'utf-8');
    const { data, content } = matter(raw);
    const fm = data as BlogFrontmatter;

    if (!fm?.slug || !fm?.title) {
      console.warn(`[blog/mdx] Skipping ${entry}: missing required frontmatter (slug/title)`);
      continue;
    }

    posts.push({
      ...fm,
      categories: fm.categories ?? [],
      author: fm.author ?? {},
      content,
      filepath,
    });
  }

  return posts.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA;
  });
}

export const getAllBlogs = cache(async (): Promise<BlogPost[]> => {
  const all = readAllFromDisk();
  const now = Date.now();
  return all.filter((post) => {
    if (!post.publishedAt) return true;
    return new Date(post.publishedAt).getTime() <= now;
  });
});

export const getBlogSlugs = cache(async (): Promise<string[]> => {
  const blogs = await getAllBlogs();
  return blogs.map((b) => b.slug);
});

export const getBlogBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  const blogs = await getAllBlogs();
  return blogs.find((b) => b.slug === slug) ?? null;
});

export async function getBlogsByComponent(
  component: string,
  limit?: number,
): Promise<BlogPost[]> {
  const blogs = await getAllBlogs();
  const filtered = blogs.filter((b) => b.component === component);
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}

export async function getBlogsByComponentSlug(
  componentSlug: string,
  limit?: number,
): Promise<BlogPost[]> {
  const component = getBlogComponentBySlug(componentSlug);
  if (!component) return [];
  return getBlogsByComponent(component.label, limit);
}

export function paginateBlogs<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function pageCount(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export async function searchBlogs(query: string): Promise<BlogPost[]> {
  if (!query.trim()) return [];
  const needle = query.toLowerCase();
  const blogs = await getAllBlogs();
  return blogs.filter(
    (b) =>
      b.title.toLowerCase().includes(needle) ||
      b.content.toLowerCase().includes(needle),
  );
}

export async function groupBlogsByComponent(): Promise<Record<string, BlogPost[]>> {
  const blogs = await getAllBlogs();
  const grouped: Record<string, BlogPost[]> = {};
  for (const blog of blogs) {
    const key = blog.component || 'Uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(blog);
  }
  return grouped;
}

export function componentSlugForBlog(blog: Pick<BlogPost, 'component'>): string | null {
  return normalizeBlogComponentSlug(blog.component);
}

export function excerpt(mdx: string, length: number): string {
  const stripped = mdx
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length <= length) return stripped;
  return `${stripped.slice(0, length).trimEnd()}…`;
}

export type TocHeading = {
  text: string;
  id: string;
};

function stripMdxForText(mdx: string): string {
  return mdx
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^(import|export)\s.*?$/gm, '')
    .replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*\/>/g, '')
    .replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readingTimeMinutes(mdx: string): number {
  const text = stripMdxForText(mdx);
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 225));
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

export function extractTocHeadings(mdx: string): TocHeading[] {
  const counts = new Map<string, number>();
  return mdx
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .map((line) => /^##\s+(?!#)(.+)$/.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => {
      const text = match[1].replace(/[*_`]+/g, '').trim();
      const baseId = slugifyHeading(text);
      const count = (counts.get(baseId) ?? 0) + 1;
      counts.set(baseId, count);
      return {
        text,
        id: count === 1 ? baseId : `${baseId}-${count}`,
      };
    })
    .filter((heading) => heading.text.length > 0);
}
