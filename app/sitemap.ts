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
    // const dynamicRoutes = await getAllDynamicRouteSlugs()

    const staticRoutes = routes.map((route) => (
        {
            url: `${baseUrl}${route}`,
            lastModified: new Date(),
        }))

    // const routePaths = {
    //     post: 'blog',
    //     pressArticle: 'press',
    //     job: 'careers',
    //     event: 'events'
    // };

    // const mappedDynamicRoutes = dynamicRoutes.map((route) => {
    //     const path = routePaths[route._type] || '';
    //     return {
    //         url: `${baseUrl}/${path}/${route.slug}`,
    //         lastModified: route.publishedAt ?? new Date(),
    //     };
    // });


    // const allRoutes = [...staticRoutes, ...mappedDynamicRoutes]
    const allRoutes = [...staticRoutes]


    return allRoutes.map((route) => ({
        ...route,
        changefreq: "daily",
        priority: 0.7,
    }))

}