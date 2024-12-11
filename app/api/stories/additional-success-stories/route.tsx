import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface ReviewDocument extends SanityDocument {
    _type: 'additionalSuccessStories'
    title: string
    publishedAt: string
}

export async function GET() {
    try {
        const additionalStories = await client.fetch<ReviewDocument[]>(`*[_type == "additionalSuccessStories"]`)
        console.log(additionalStories);

        additionalStories.forEach((review) => {
            if (review.image?.asset?._ref) {
                review.image.asset.image_url = urlForImage(review.image.asset);  // Add the image URL to the response
            }
        })

        return NextResponse.json(additionalStories)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
