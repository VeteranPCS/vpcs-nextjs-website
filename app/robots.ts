import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/*',
                '/error',
                '/not-found',
                '/studio',
                '/studio/*',
                '/thank-you',
                '/blog-search',
                '/blog-search/*',
                '/blog-search?*',
                '/contact-lender?*',
                '/contact-agent?*',
            ],
        },
        sitemap: `${process.env.NEXT_PUBLIC_API_BASE_URL}/sitemap.xml`,
    }
}