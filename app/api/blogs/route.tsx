import { NextResponse } from 'next/server'
import { client } from '../../../sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface ReviewDocument extends SanityDocument {
    _type: 'blog'
    title: string
    publishedAt: string
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const slug = searchParams.get('slug')

        if (slug) {
            const post = await client.fetch<PostDocument>(
                `*[_type == "blog" && slug.current == $slug][0]`,
                { slug }
            )

            if (!post) {
                return NextResponse.json({ error: 'Post not found' }, { status: 404 })
            }

            if (post.mainImage?.asset?._ref) {
                post.mainImage.asset.image_url = urlForImage(post.mainImage.asset);  // Add the image URL to the response
            }

            return NextResponse.json(post)
        } else {
            const posts = await client.fetch<PostDocument[]>(`*[_type == "blog"]`);

            posts.forEach((post) => {
                if (post.mainImage?.asset?._ref) {
                    post.mainImage.asset.image_url = urlForImage(post.mainImage.asset);  // Add the image URL to the response
                }
            })

            return NextResponse.json(posts);
        }
    } catch (error) {
        return NextResponse.json({ error: `Error fetching post(s): ${error}` }, { status: 500 })
    }
}
