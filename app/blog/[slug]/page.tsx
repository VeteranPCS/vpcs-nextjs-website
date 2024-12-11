"use client";
// From RDS: This page needs to be rendered on the server in order to take advantage of the SEO benefits of Next.js.
// We will need to support the Metadata object from Next as well as JSON-LD on this page to ensure that the SEO benefits are maintained.
// Blogs can use design patterns that allow the majority of content to be rendered on the server. Aspects that require client interactivity can be moved to their own components or pulled in using dynamic from next/dynamic.
import { useEffect, useState, useCallback, memo } from "react";
import blogService from '@/services/blogService';
import BlogDetail from "@/components/Blog/BlogDetail";

const MemoizedBlogDetail = memo(BlogDetail);

// Define the interface for the blog data
interface BlogData {
    title: string;
    publishedAt: string;
    mainImage: {
        asset: {
            image_url: string;
        };
    };
    content: {
        _key: string;
        style: string;
        children: {
            _key: string;
            marks: string[];
            text: string;
        }[];
    }[];
}

// Define the Params interface for the URL params
interface Params {
    slug: string;
}

export default function Post({ params }: { params: Params }) {
    // Initialize blogData with the correct type
    const [blogData, setBlogData] = useState<BlogData | null>(null); // Start with null to handle loading state

    const fetchBlog = useCallback(async () => {
        try {
            const response = await blogService.fetchBlog(params.slug);
            if (!response.ok) throw new Error('Failed to fetch posts');
            const data: BlogData = await response.json(); // Type the response as BlogData
            setBlogData(data);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }, [params.slug]);

    useEffect(() => {
        fetchBlog();
    }, [fetchBlog]);

    if (!blogData) {
        return <div>Loading...</div>;
    }

    return (
        <MemoizedBlogDetail blogData={blogData} />
    );
}
