import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image';

interface TrustedResource extends SanityDocument {
    logo?: {
        asset?: {
            _ref?: string;
            image_url?: string; // Adding a new field for the image URL
        };
    };
}

export async function GET(): Promise<NextResponse> {
    try {
        const trusted_sources: TrustedResource[] = await client.fetch(`*[_type == "trusted_resources"]`)

        trusted_sources.map((trusted_source) => {
            if (trusted_source?.logo?.asset?._ref) {
                trusted_source.logo.asset.image_url = urlForImage(trusted_source.logo.asset);
            }
        })
        
        return NextResponse.json(trusted_sources)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
