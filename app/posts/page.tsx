'use client'

import { useState, useEffect } from "react"
import postsService from "../../services/postsService"

interface Post {
  _id: string
  title: string
  publishedAt: string
}

export default function PostManager() {
  const [title, setTitle] = useState<string>('')
  const [posts, setPosts] = useState<Post[]>([])
  
  useEffect(() => {
    fetchPosts();
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await postsService.fetchPosts()
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setPosts(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const deletePost = async () => {
    try {
      const id = "7p3PQBbUNnhjdjx7zoN7ww"
      const response = await fetch(`api/posts?id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json();
    } catch (err) {
      console.error("Error while deleting: ", err)
    }
  }

  const addingPosts = async () => {
    try {
      const staticPosts = {
        _type: 'post',
        title: 'The Future of Artificial Intelligence',
        slug: {
          _type: 'slug',
          current: 'future-of-artificial-intelligence'
        },
        author: {
          _type: 'reference',
          _ref: 'b74ef192-5ac6-440a-a5c0-70a2049a03f3'
        },
        categories: [
          {
            _type: 'reference',
            _ref: '0556b158-12b3-43f9-b5e8-f9c2d4eaeb71' // AI
          },
          {
            _type: 'reference',
            _ref: 'c58ee8c3-05fe-42de-9fb7-1a4be4fda189' // Technology
          }
        ],
        // mainImage: {
        //   _type: 'image',
        //   asset: {
        //     _type: "reference",
        //     _ref: "https://dummyimage.com/600x400/000/fff"
        //   },
        //   alt: 'Abstract visualization of neural networks',
        //   hotspot: {
        //     x: 0.6,
        //     y: 0.4,
        //     height: 0.6,
        //     width: 0.6
        //   }
        // },
        publishedAt: '2024-03-20T14:30:00Z',
        body: [
          {
            _type: 'block',
            _key: '5678',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'span2',
                text: 'As we look towards the future of artificial intelligence...',
                marks: []
              }
            ]
          }
        ]
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(staticPosts)
      })

      const data = await response.json();
    } catch (err) {
      console.error("Error while adding Data: ", err)
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) return

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          publishedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) throw new Error('Failed to create post')
      await fetchPosts()
      setTitle('')
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const handleUpdate = async (postId: string) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: postId,
          title: `Updated: ${new Date().toLocaleDateString()}`,
        }),
      })

      if (!response.ok) throw new Error('Failed to update post')
      await fetchPosts()
    } catch (error) {
      console.error('Error updating post:', error)
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete post')
      await fetchPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  useEffect(() => {
    console.log(posts)
  }, [posts])

  return (
      <h1>Hello Post</h1>
  );
}