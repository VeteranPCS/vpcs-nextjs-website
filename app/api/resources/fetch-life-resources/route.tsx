import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { SanityDocument } from '@sanity/client';
import { urlForImage } from '@/sanity/lib/image';

interface LifeResource extends SanityDocument {
    logo?: {
        asset?: {
            _ref?: string;
            image_url?: string; // Adding a new field for the image URL
        };
    };
}

export async function GET(): Promise<NextResponse> {
    try {
        // Fetch data from Sanity
        const life_resources: LifeResource[] = await client.fetch(`*[_type == "life_resources"]`);

        // Map over life resources to add image URLs
        life_resources.forEach((life_resource) => {
            if (life_resource?.logo?.asset?._ref) {
                life_resource.logo.asset.image_url = urlForImage(life_resource.logo.asset);
            }
        });

        // Return the JSON response
        return NextResponse.json(life_resources);
    } catch (error) {
        console.error('Error fetching life resources:', error);
        return NextResponse.json(
            { error: 'Error fetching User Images' },
            { status: 500 }
        );
    }
}
