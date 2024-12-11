"use client"
// From RDS: This page needs to be rendered on the server in order to take advantage of the SEO benefits of Next.js.
// We will need to support the Metadata object from Next as well as JSON-LD on this page to ensure that the SEO benefits are maintained.
// Utilize patterns that take advantage of Sanity's ability to render content on the server to avoid needing to memoize the blogs.
import { useEffect, useState, memo, useCallback } from 'react';
import blogService from '@/services/blogService';
import BlogListing from '@/components/Blog/BlogListing';

const MemoizedBlogListing = memo(BlogListing)

export default function Blogs() {
    const [blogList, setBlogList] = useState([]);

    const fetchBlogs = useCallback(async () => {
        try {
            const response = await blogService.fetchBlogs()
            if (!response.ok) throw new Error('Failed to fetch posts')
            const data = await response.json()
            setBlogList(data)
        } catch (error) {
            console.error('Error fetching posts:', error)
        }
    }, [])

    useEffect(() => {
        fetchBlogs()
    }, [fetchBlogs])

    return (
        <MemoizedBlogListing blogList={blogList} />
    )
}