import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface PostDocument extends SanityDocument {
    _type: 'post'
    title: string
    publishedAt: string
}

export async function GET() {
    try {
        const videoReview = await client.fetch<PostDocument[]>(`*[_type == "video_review"][0]`)
        return NextResponse.json(videoReview)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching Video Reviews' }, { status: 500 })
    }
}
