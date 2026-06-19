import { getBlogBySlug, getBlogSlugs } from '@/lib/blog/mdx';
import { getRegistryPost } from '@/lib/blog/registry';
import { buildBlogPageMarkdown } from '@/lib/blog/pageMarkdown';
import { SITE_URL } from '@/lib/siteUrl';

export const revalidate = 86400;

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    return new Response('Not found', { status: 404 });
  }

  const body = buildBlogPageMarkdown(post, {
    baseUrl: SITE_URL,
    registryPost: getRegistryPost(post.slug),
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
