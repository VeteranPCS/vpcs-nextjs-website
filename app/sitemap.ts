import { getBlogSlugs } from "@/lib/blog/mdx";
import stateService from "@/services/stateService";
import { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const routes = [
        "",
        "/about",
        "/agents",
        "/bah-calculator",
        "/blog",
        "/contact",
        "/contact-agent",
        "/contact-lender",
        "/get-listed-agents",
        "/get-listed-lenders",
        "/impact",
        "/how-it-works",
        "/lenders",
        "/military-spouse",
        "/pcs-resources",
        "/privacy-policy",
        "/terms-of-use",
        "/spanish",
        "/stories",
        "/kick-start-your-career",
        "/guides",
        "/charity",
        "/va-loan-help",
        "/va-loan-calculator",
        "/llms.txt",
        "/llms-full.txt",
        "/ai.txt",
    ]

    const stateRoutes = await stateService.fetchStateList();
    const blogSlugs = await getBlogSlugs();

    const staticRoutes = routes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
    }));

    const mappedStateRoutes = stateRoutes.flatMap((route) => {
        const path = route.state_slug.current;
        return [
            { url: `${baseUrl}/${path}`, lastModified: new Date() },
            { url: `${baseUrl}/${path}/llms.txt`, lastModified: new Date() },
        ];
    });

    const mappedBlogRoutes = blogSlugs.flatMap((slug) => [
        { url: `${baseUrl}/blog/${slug}`, lastModified: new Date() },
        { url: `${baseUrl}/blog/${slug}/page.md`, lastModified: new Date() },
    ]);

    const allRoutes = [...staticRoutes, ...mappedStateRoutes, ...mappedBlogRoutes];

    return allRoutes.map((route) => ({
        ...route,
        changefreq: "daily",
        priority: 0.7,
    }));
}
