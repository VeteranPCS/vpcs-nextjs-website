import components from '@/content/_data/blog-components.json';

export type BlogCtaIntent = 'agent' | 'lender';

export type BlogComponent = {
  slug: string;
  label: string;
  description: string;
  ctaCopy?: string;
  partnerIntent: BlogCtaIntent;
};

function isBlogCtaIntent(value: unknown): value is BlogCtaIntent {
  return value === 'agent' || value === 'lender';
}

// JSON imports are only assertion-checked by TypeScript, so a category added
// without a valid partnerIntent would silently fall back to 'agent'. Fail the
// build instead: every canonical category must declare its intent explicitly.
function validateBlogComponents(raw: unknown): readonly BlogComponent[] {
  if (!Array.isArray(raw)) {
    throw new Error('blog-components.json must be an array of categories');
  }
  for (const entry of raw) {
    if (!isBlogCtaIntent(entry?.partnerIntent)) {
      throw new Error(
        `blog-components.json: category "${entry?.slug}" has a missing or invalid partnerIntent ` +
        `(expected 'agent' or 'lender', got ${JSON.stringify(entry?.partnerIntent)})`,
      );
    }
  }
  return raw as readonly BlogComponent[];
}

export const BLOG_COMPONENTS = validateBlogComponents(components);

// Only import __testables from tests.
export const __testables = { validateBlogComponents };

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

export function getBlogCtaIntent(componentSlug: string | null | undefined): BlogCtaIntent {
  return getBlogComponentBySlug(componentSlug)?.partnerIntent ?? 'agent';
}

export function getBlogComponentByLabel(label: string | null | undefined): BlogComponent | null {
  const slug = normalizeBlogComponentSlug(label);
  return slug ? getBlogComponentBySlug(slug) : null;
}
