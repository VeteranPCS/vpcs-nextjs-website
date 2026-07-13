import { getAllBlogs } from '@/lib/blog/mdx';
import { SITE_URL } from '@/lib/siteUrl';

export const revalidate = 86400;

const FEED_ITEM_LIMIT = 50;

// Mirrors the /blog landing metadata (app/(site)/blog/page.tsx); those
// constants are module-local so the strings are duplicated here on purpose.
const CHANNEL_TITLE =
  'Military PCS & VA Loan Guides - Real Estate Advice for Service Members';
const CHANNEL_DESCRIPTION =
  "Expert resources for military homebuyers and sellers. Get PCS checklists, BAH maximization strategies, VA loan qualification guides, and base-specific housing insights written by veterans who've been in your boots.";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// RSS 2.0 pubDate must be RFC 822; Date#toUTCString emits the compatible
// RFC 1123 form ("Sat, 12 Jul 2026 00:00:00 GMT").
function toRfc822(dateInput: string): string | null {
  const date = new Date(dateInput);
  return Number.isNaN(date.getTime()) ? null : date.toUTCString();
}

export async function GET(): Promise<Response> {
  const blogs = (await getAllBlogs()).slice(0, FEED_ITEM_LIMIT);

  const items = blogs
    .map((blog) => {
      const link = `${SITE_URL}/blog/${blog.slug}`;
      const description = blog.description || blog.metaDescription || '';
      const pubDate = toRfc822(blog.publishedAt);
      return [
        '    <item>',
        `      <title>${escapeXml(blog.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid>${escapeXml(link)}</guid>`,
        ...(pubDate ? [`      <pubDate>${pubDate}</pubDate>`] : []),
        ...(description
          ? [`      <description>${escapeXml(description)}</description>`]
          : []),
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(CHANNEL_TITLE)}</title>`,
    `    <link>${escapeXml(`${SITE_URL}/blog`)}</link>`,
    `    <description>${escapeXml(CHANNEL_DESCRIPTION)}</description>`,
    '    <language>en-us</language>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml"/>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
