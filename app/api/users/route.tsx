import { NextResponse } from 'next/server'
import { client } from '../../../sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface PostDocument extends SanityDocument {
    _type: 'post'
    title: string
    publishedAt: string
}

export async function GET() {
    try {
        const users = await client.fetch<PostDocument[]>(`*[_type == "users"]`)

        users.forEach((user) => {
            if (user.userImage?.asset?._ref) {
                user.userImage.asset.image_url = urlForImage(user.userImage.asset);  // Add the image URL to the response
            }
        })
        return NextResponse.json(users)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
