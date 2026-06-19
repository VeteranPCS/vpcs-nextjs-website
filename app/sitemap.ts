import { BLOG_COMPONENTS } from "@/lib/blog/components";
import {
    BLOG_CATEGORY_PAGE_SIZE,
    getAllBlogs,
    pageCount,
} from "@/lib/blog/mdx";
import { SITE_URL } from "@/lib/siteUrl";
import stateService from "@/services/stateService";
import { MetadataRoute } from "next"

const STATIC_LAST_MODIFIED = new Date("2026-06-18T00:00:00.000Z");

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

    const staticRoutes = routes.map((route) => ({
        url: `${SITE_URL}${route}`,
        lastModified: route === "/blog" ? latestDate(blogs.map(dateFromBlog)) : STATIC_LAST_MODIFIED,
    }));

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

    const allRoutes = [...staticRoutes, ...mappedStateRoutes, ...mappedBlogRoutes, ...mappedCategoryRoutes];

    return allRoutes.map((route) => ({
        ...route,
        changefreq: "daily",
        priority: 0.7,
    }));
}
