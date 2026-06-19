import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BLOG_COMPONENTS, getBlogComponentBySlug } from '@/lib/blog/components';
import { BLOG_CATEGORY_PAGE_SIZE, getBlogsByComponentSlug, pageCount } from '@/lib/blog/mdx';
import { SITE_URL } from '@/lib/siteUrl';
import { CategoryBlogPage } from '../../CategoryBlogPage';

export const revalidate = 86400;

export async function generateStaticParams() {
  const params: Array<{ category: string; page: string }> = [];
  for (const component of BLOG_COMPONENTS) {
    const posts = await getBlogsByComponentSlug(component.slug);
    const totalPages = pageCount(posts.length, BLOG_CATEGORY_PAGE_SIZE);
    for (let page = 2; page <= totalPages; page += 1) {
      params.push({ category: component.slug, page: String(page) });
    }
  }
  return params;
}

export async function generateMetadata(
  props: { params: Promise<{ category: string; page: string }> },
): Promise<Metadata> {
  const { category, page: pageParam } = await props.params;
  const component = getBlogComponentBySlug(category);
  const page = Number(pageParam);
  if (!component || !Number.isInteger(page)) return { title: 'Category not found' };

  return {
    metadataBase: new URL(SITE_URL),
    title: `${component.label} Guides, Page ${page}`,
    description: component.description,
    alternates: {
      canonical: `${SITE_URL}/blog/category/${component.slug}/page/${page}`,
    },
  };
}

export default async function Page(
  props: { params: Promise<{ category: string; page: string }> },
) {
  const { category, page: pageParam } = await props.params;
  const page = Number(pageParam);
  if (pageParam === '1') redirect(`/blog/category/${category}`);
  if (!Number.isInteger(page) || page < 1) notFound();

  return <CategoryBlogPage category={category} page={page} />;
}
