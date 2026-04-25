import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { cache } from 'react';
import type { BlogFrontmatter, BlogPost } from '@/lib/blog/types';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

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
