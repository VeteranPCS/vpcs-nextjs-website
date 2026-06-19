import matter from 'gray-matter';
import type { BlogPost } from '@/lib/blog/types';
import type { InternalLinkRegistryPost } from '@/lib/blog/registry';

export function stripMdxForMarkdown(mdx: string): string {
  return mdx
    .replace(/^(import|export)\s.*?$/gm, '')
    .replace(/<[A-Z][A-Za-z0-9]*\s[^>]*\/>/g, '')
    .replace(/<[A-Z][A-Za-z0-9]*\s*\/>/g, '')
    .replace(/<([A-Z][A-Za-z0-9]*)[^>]*>([\s\S]*?)<\/\1>/g, '$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type BuildBlogPageMarkdownOptions = {
  baseUrl: string;
  registryPost?: Pick<InternalLinkRegistryPost, 'componentSlug' | 'stateSlug'> | null;
};

export function buildBlogPageMarkdown(
  post: BlogPost,
  { baseUrl, registryPost }: BuildBlogPageMarkdownOptions,
): string {
  const canonical = `${baseUrl.replace(/\/$/, '')}/blog/${post.slug}`;
  const author = post.author?.name ?? 'VeteranPCS';
  const updatedAt = post.updatedAt ?? post.publishedAt;
  const frontmatter: Record<string, unknown> = {
    title: post.title,
    slug: post.slug,
    description: post.metaDescription ?? '',
    publishedAt: post.publishedAt,
    updatedAt,
    author,
    categories: post.categories ?? [],
    canonical,
  };

  if (registryPost?.componentSlug) {
    frontmatter.componentSlug = registryPost.componentSlug;
  }
  if (registryPost?.stateSlug) {
    frontmatter.stateSlug = registryPost.stateSlug;
  }

  return matter.stringify(
    [`# ${post.title}`, '', stripMdxForMarkdown(post.content), ''].join('\n'),
    frontmatter,
  );
}
