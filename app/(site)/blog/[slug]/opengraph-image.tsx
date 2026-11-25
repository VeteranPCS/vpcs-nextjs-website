import { renderBlogSocialImage } from '@/lib/blog/social-image';

export const runtime = 'nodejs';
export const alt = 'VeteranPCS Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return renderBlogSocialImage(slug, size);
}
