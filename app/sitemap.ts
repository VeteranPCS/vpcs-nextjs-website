import blogService from "@/services/blogService";
import stateService from "@/services/stateService";
import { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const routes = [
        "",
        "/about",
        "/blog",
        "/contact",
        "/contact-agent",
        "/contact-lender",
        "/get-listed-agents",
        "/get-listed-lenders",
        "/impact",
        "/how-it-works",
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
    ]

    const stateRoutes = await stateService.fetchStateList();
    const blogRoutes = await blogService.fetchBlogSlugs();


    const staticRoutes = routes.map((route) => (
        {
            url: `${baseUrl}${route}`,
            lastModified: new Date(),
        }))

    const mappedStateRoutes = stateRoutes.map((route) => {
        const path = route.state_slug.current;
        return {
            url: `${baseUrl}/${path}`,
            lastModified: new Date(),
        };
    });

    const mappedBlogRoutes = blogRoutes.map((route) => {
        const path = route.slug;
        return {
            url: `${baseUrl}/blog/${path}`,
            lastModified: new Date(),
        };
    });

    const allRoutes = [...staticRoutes, ...mappedStateRoutes, ...mappedBlogRoutes]


    return allRoutes.map((route) => ({
        ...route,
        changefreq: "daily",
        priority: 0.7,
    }))

}