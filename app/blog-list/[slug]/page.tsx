"use client";

import { useEffect, useState } from "react";
import blogService from '@/services/blogService';
import BlogDetail from "@/components/Blog/BlogDetail";

export default function Post({ params }) {
    const [blogData, setBlogData] = useState({})

    useEffect(() => {
        console.log(blogData)
    }, [blogData])

    useEffect(() => {
        fetchBlog()
    }, [])

    const fetchBlog = async () => {
        try {
            const response = await blogService.fetchBlog(params.slug)
            if (!response.ok) throw new Error('Failed to fetch posts')
            const data = await response.json()
            setBlogData(data)
        } catch (error) {
            console.error('Error fetching posts:', error)
        }
    }

    return (
        <BlogDetail blogData={blogData} />
    );
}