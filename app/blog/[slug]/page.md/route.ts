import { getBlogBySlug, getBlogSlugs } from '@/lib/blog/mdx';

export const revalidate = 86400;

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

function stripJsx(mdx: string): string {
  return mdx
    .replace(/^(import|export)\s.*?$/gm, '')
    .replace(/<[A-Z][A-Za-z0-9]*\s[^>]*\/>/g, '')
    .replace(/<[A-Z][A-Za-z0-9]*\s*\/>/g, '')
    .replace(/<([A-Z][A-Za-z0-9]*)[^>]*>([\s\S]*?)<\/\1>/g, '$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    return new Response('Not found', { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://veteranpcs.com';
  const canonical = `${baseUrl.replace(/\/$/, '')}/blog/${post.slug}`;
  const author = post.author?.name ?? 'VeteranPCS';
  const updatedAt = post.updatedAt ?? post.publishedAt;
  const categories = (post.categories ?? []).join(', ');
  const description = post.metaDescription ?? '';

  const body = [
    '---',
    `title: ${post.title}`,
    `slug: ${post.slug}`,
    `description: ${description}`,
    `publishedAt: ${post.publishedAt}`,
    `updatedAt: ${updatedAt}`,
    `author: ${author}`,
    `categories: [${categories}]`,
    `canonical: ${canonical}`,
    '---',
    '',
    `# ${post.title}`,
    '',
    stripJsx(post.content),
    '',
  ].join('\n');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
