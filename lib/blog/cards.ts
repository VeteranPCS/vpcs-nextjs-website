import { excerpt, readingTimeMinutes } from '@/lib/blog/mdx';
import type { CtaTrackingInput } from '@/lib/analytics/cta';
import type { InternalLinkRegistryPost } from '@/lib/blog/registry';
import type { BlogPost } from '@/lib/blog/types';

// Lightweight shape BlogCard renders from. Registry posts carry no body, so
// everything beyond slug/title is optional and the card degrades gracefully.
export type BlogCardData = {
  slug: string;
  title: string;
  shortTitle?: string;
  description?: string;
  publishedAt?: string;
  // Component label ("PCS Help", "VA Loan Help", ...) shown as the card badge.
  badge?: string;
  image?: { src: string; alt: string };
  authorName?: string;
  readTimeMinutes?: number;
};

// Event identity every caller must supply; BlogCard fills in the rest so a
// card can never ship without a trackable cta_id.
export type BlogCardCtaContext = Pick<
  CtaTrackingInput,
  'ctaId' | 'ctaPosition' | 'pageType' | 'ctaLocation'
>;

export function buildBlogCardCta(
  cta: BlogCardCtaContext,
  slug: string,
): CtaTrackingInput {
  return {
    ctaId: cta.ctaId,
    ctaPosition: cta.ctaPosition,
    pageType: cta.pageType,
    ctaLocation: cta.ctaLocation,
    ctaIntent: 'content_navigation',
    ctaComponent: 'blog_card',
    destination: `/blog/${slug}`,
    contentSlug: slug,
    contentType: 'blog_post',
  };
}

export function toBlogCardData(post: BlogPost): BlogCardData {
  const description =
    post.description || post.metaDescription || excerpt(post.content, 250);
  const imageSrc = post.mainImage?.src;

  return {
    slug: post.slug,
    title: post.title,
    shortTitle: post.shortTitle,
    description: description || undefined,
    publishedAt: post.publishedAt,
    badge: post.component || post.categories?.[0],
    image: imageSrc
      ? { src: imageSrc, alt: post.mainImage.alt || post.title }
      : undefined,
    authorName: post.author?.name,
    readTimeMinutes: readingTimeMinutes(post.content),
  };
}

export function registryPostToCardData(
  post: InternalLinkRegistryPost,
): BlogCardData {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description || undefined,
    publishedAt: post.publishedAt ?? undefined,
    badge: post.component || post.categories?.[0],
  };
}
