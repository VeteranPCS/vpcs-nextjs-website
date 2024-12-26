import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface ReviewDocument extends SanityDocument {
    _type: 'post'
    title: string
    publishedAt: string
}

export async function GET() {
    try {
        const reviews = await client.fetch<ReviewDocument[]>(`*[_type == "review"]`)

        reviews.forEach((review) => {
            if (review.user_logo?.asset?._ref) {
                review.user_logo.asset.image_url = urlForImage(review.user_logo.asset);  // Add the image URL to the response
            }
        })

        return NextResponse.json(reviews)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
