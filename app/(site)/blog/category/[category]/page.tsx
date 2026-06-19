import type { Metadata } from 'next';
import { getBlogComponentBySlug } from '@/lib/blog/components';
import { SITE_URL } from '@/lib/siteUrl';
import { CategoryBlogPage, categoryStaticParams } from './CategoryBlogPage';

export const revalidate = 86400;

export async function generateStaticParams() {
  return categoryStaticParams();
}

export async function generateMetadata(
  props: { params: Promise<{ category: string }> },
): Promise<Metadata> {
  const { category } = await props.params;
  const component = getBlogComponentBySlug(category);
  if (!component) return { title: 'Category not found' };

  return {
    metadataBase: new URL(SITE_URL),
    title: `${component.label} Guides`,
    description: component.description,
    alternates: {
      canonical: `${SITE_URL}/blog/category/${component.slug}`,
    },
    openGraph: {
      title: `${component.label} Guides`,
      description: component.description,
      url: `${SITE_URL}/blog/category/${component.slug}`,
      type: 'website',
    },
  };
}

export default async function Page(props: { params: Promise<{ category: string }> }) {
  const { category } = await props.params;
  return <CategoryBlogPage category={category} />;
}
