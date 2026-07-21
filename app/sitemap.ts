import { BLOG_COMPONENTS } from "@/lib/blog/components";
import {
    BLOG_CATEGORY_PAGE_SIZE,
    getAllBlogs,
    pageCount,
} from "@/lib/blog/mdx";
import { HOW_IT_WORKS_SECTIONS, MOVE_IN_BONUS } from "@/lib/content/how-it-works";
import { SITE_URL } from "@/lib/siteUrl";
import stateService from "@/services/stateService";
import { MetadataRoute } from "next"

const STATIC_LAST_MODIFIED = new Date("2026-06-18T00:00:00.000Z");

// /how-it-works renders from the how_veterence_pcs_works + moveInBonus docs;
// its lastModified is the max _updatedAt across all of them.
const HOW_IT_WORKS_LAST_MODIFIED = latestDate(
    [...HOW_IT_WORKS_SECTIONS.map((doc) => doc._updatedAt), MOVE_IN_BONUS._updatedAt]
        .map((updatedAt) => new Date(updatedAt)),
);

function dateFromBlog(post: { updatedAt?: string; publishedAt?: string }): Date {
    const candidate = post.updatedAt ?? post.publishedAt;
    const date = candidate ? new Date(candidate) : STATIC_LAST_MODIFIED;
    return Number.isNaN(date.getTime()) ? STATIC_LAST_MODIFIED : date;
}

function latestDate(dates: Date[]): Date {
    const latest = dates
        .map((date) => date.getTime())
        .filter((time) => !Number.isNaN(time))
        .sort((a, b) => b - a)[0];
    return latest ? new Date(latest) : STATIC_LAST_MODIFIED;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    const blogs = await getAllBlogs();

    const staticRoutes = routes.map((route) => {
        let lastModified = STATIC_LAST_MODIFIED;
        if (route === "/blog") lastModified = latestDate(blogs.map(dateFromBlog));
        if (route === "/how-it-works") lastModified = HOW_IT_WORKS_LAST_MODIFIED;
        return { url: `${SITE_URL}${route}`, lastModified };
    });

    const mappedStateRoutes = stateRoutes.flatMap((route) => {
        const path = route.state_slug.current;
        const updated = route._updatedAt ? new Date(route._updatedAt) : STATIC_LAST_MODIFIED;
        const lastModified = Number.isNaN(updated.getTime()) ? STATIC_LAST_MODIFIED : updated;
        return [
            { url: `${SITE_URL}/${path}`, lastModified },
            { url: `${SITE_URL}/${path}/llms.txt`, lastModified },
        ];
    });

    const mappedBlogRoutes = blogs.flatMap((post) => {
        const lastModified = dateFromBlog(post);
        return [
            { url: `${SITE_URL}/blog/${post.slug}`, lastModified },
            { url: `${SITE_URL}/blog/${post.slug}/page.md`, lastModified },
        ];
    });

    const mappedCategoryRoutes = BLOG_COMPONENTS.flatMap((component) => {
        const posts = blogs.filter((post) => post.component === component.label);
        if (posts.length === 0) return [];
        const totalPages = pageCount(posts.length, BLOG_CATEGORY_PAGE_SIZE);
        const lastModified = latestDate(posts.map(dateFromBlog));
        const urls = [{ url: `${SITE_URL}/blog/category/${component.slug}`, lastModified }];
        for (let page = 2; page <= totalPages; page += 1) {
            urls.push({ url: `${SITE_URL}/blog/category/${component.slug}/page/${page}`, lastModified });
        }
        return urls;
    });

    // All-posts archive (/blog/page/2..N); page 1 is /blog itself. Same lastmod
    // logic as the category page/N entries: latest post date in the set.
    const archiveLastModified = latestDate(blogs.map(dateFromBlog));
    const archiveTotalPages = pageCount(blogs.length, BLOG_CATEGORY_PAGE_SIZE);
    const mappedArchiveRoutes: Array<{ url: string; lastModified: Date }> = [];
    for (let page = 2; page <= archiveTotalPages; page += 1) {
        mappedArchiveRoutes.push({ url: `${SITE_URL}/blog/page/${page}`, lastModified: archiveLastModified });
    }

    const allRoutes = [...staticRoutes, ...mappedStateRoutes, ...mappedBlogRoutes, ...mappedCategoryRoutes, ...mappedArchiveRoutes];

    return allRoutes.map((route) => ({
        ...route,
        changefreq: "daily",
        priority: 0.7,
    }));
}
