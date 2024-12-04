import React, { useEffect } from 'react';
import { Grid, Typography, Container, Box, Breadcrumbs } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import BlockContent from './BlockContent';

const BlogDetail = ({ blogData }) => {

    useEffect(() => {
        console.log(blogData)
    }, [blogData])

    return (
      <div className="max-w-7xl mx-auto py-16 px-4">
        <nav className="flex mb-8 text-gray-600">
          <button 
            onClick={() => window.location.href = '/'}
            className="hover:text-blue-600"
          >
            Home
          </button>
          <span className="mx-2">/</span>
          <button 
            onClick={() => window.location.href = '/blog'}
            className="hover:text-blue-600"
          >
            Blog
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{blogData?.title}</span>
        </nav>
  
        <article className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {blogData?.title}
          </h1>
          <time className="text-gray-600 mb-8 block">
            {new Date(blogData?.publishedAt).toLocaleDateString()}
          </time>
          
          <div className="relative h-96 mb-8">
            <img
              src={blogData?.mainImage?.asset?.image_url || "/api/placeholder/400/320"}
              alt={blogData?.title}
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
            />
          </div>
  
          <div className="prose prose-lg max-w-none">
            {blogData?.content?.map((block, index) => (
              <BlockContent key={block._key || index} block={block} />
            ))}
          </div>
        </article>
      </div>
    );
  };

export default BlogDetail