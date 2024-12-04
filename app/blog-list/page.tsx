"use client"

import { useEffect, useState } from 'react';
import blogService from '@/services/blogService';
import BlogListing from '@/components/Blog/BlogListing';

export default function Blogs() {
    const [blogList, setBlogList] = useState([]);

    const fetchBlogs = async () => {
        try {
            const response = await blogService.fetchBlogs()
            if (!response.ok) throw new Error('Failed to fetch posts')
            const data = await response.json()
            setBlogList(data)
        } catch (error) {
            console.error('Error fetching posts:', error)
        }
    }

    useEffect(() => {
        console.log(blogList)
    }, [blogList])

    useEffect(() => {
        fetchBlogs()
    }, [])


    return (
        <BlogListing blogList={blogList}/>
    )
}