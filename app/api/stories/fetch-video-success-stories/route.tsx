import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { VideoSuccessStory } from '@/services/storiesService'

export async function GET() {
    try {
        const additionalStories = await client.fetch<VideoSuccessStory>(`*[_type == "video_success_stories"]`)

        return NextResponse.json(additionalStories)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching Video Success Stories' }, { status: 500 })
    }
}
