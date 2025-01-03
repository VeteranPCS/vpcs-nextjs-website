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
        "/impact",
        "/how-it-works",
        "/privacy-policy",
        "/terms-of-use",
        "/militaryspouse",
    ]

    const stateRoutes = await stateService.fetchStateList();
    const blogRoutes = await blogService.fetchBlogSlugs();


    const staticRoutes = routes.map((route) => (
        {
            url: `${baseUrl}${route}`,
            lastModified: new Date(),
        }))

    const mappedStateRoutes = stateRoutes.map((route) => {
        const path = route.city_slug.current;
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