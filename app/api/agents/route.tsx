import { NextResponse } from 'next/server'
import { client } from '../../../sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'

interface MainImage {
    alt: string; // Alternative text for the image
    asset: {
        image_url: string; // URL of the image
        _ref: string; // Reference ID for the image asset
        _type: string; // Type of the asset, typically "reference"
    };
    _type: "image"; // Type of the main image, typically "image"
}

interface AgentDocument extends SanityDocument {
    mainImage: MainImage;
    publishedAt: string;
    title: string;
    _createdAt: string;
    _id: string;
    _rev: string;
    _type: 'agents';
    _updatedAt: string;
}

export async function GET() {
    try {
        const agents = await client.fetch<AgentDocument[]>(`*[_type == "real-state-agents"]`);

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
