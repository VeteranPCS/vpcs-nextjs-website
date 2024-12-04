import { NextResponse } from 'next/server'
import { client } from '../../../sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface PostDocument extends SanityDocument {
    _type: 'agents'
    title: string
    publishedAt: string
}

export async function GET() {
    try {
        const agents = await client.fetch<PostDocument[]>(`*[_type == "real-state-agents"]`);
        console.log("Fetched agents:", agents);

        if (agents.length === 0) {
            console.log("No agents found.");
        }

        agents.forEach((agent) => {
            if (agent.mainImage?.asset?._ref) {
                agent.mainImage.asset.image_url = urlForImage(agent.mainImage.asset);
            }
        });

        return NextResponse.json(agents);
    } catch (error) {
        console.error("Error fetching agents:", error);
        return NextResponse.json({ error: 'Error fetching agents' }, { status: 500 });
    }
}
