import components from '@/content/_data/blog-components.json';

export type BlogComponent = {
  slug: string;
  label: string;
  description: string;
  ctaCopy?: string;
};

export const BLOG_COMPONENTS = components as readonly BlogComponent[];

export const BLOG_COMPONENT_BY_SLUG: ReadonlyMap<string, BlogComponent> = new Map(
  BLOG_COMPONENTS.map((component) => [component.slug, component]),
);

export const BLOG_COMPONENT_BY_LABEL: ReadonlyMap<string, BlogComponent> = new Map(
  BLOG_COMPONENTS.map((component) => [component.label, component]),
);

function slugifyComponent(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeBlogComponentSlug(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (BLOG_COMPONENT_BY_SLUG.has(normalized)) return normalized;
  const byLabel = BLOG_COMPONENT_BY_LABEL.get(normalized);
  if (byLabel) return byLabel.slug;

  const slug = slugifyComponent(normalized);
  return BLOG_COMPONENT_BY_SLUG.has(slug) ? slug : null;
}

export function getBlogComponentBySlug(slug: string | null | undefined): BlogComponent | null {
  if (!slug) return null;
  return BLOG_COMPONENT_BY_SLUG.get(slug) ?? null;
}

export function getBlogComponentByLabel(label: string | null | undefined): BlogComponent | null {
  const slug = normalizeBlogComponentSlug(label);
  return slug ? getBlogComponentBySlug(slug) : null;
}
