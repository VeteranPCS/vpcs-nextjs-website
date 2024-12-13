"use client"
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