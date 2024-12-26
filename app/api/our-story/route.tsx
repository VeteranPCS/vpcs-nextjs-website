import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image';

interface ImageAsset {
    _ref: string;
    _type?: string; // Add _type if expected by urlForImage
    [key: string]: any; // Add index signature for flexibility
    image_url?: string; // Optional field for the URL
}

interface Poster {
    asset?: ImageAsset;
}

interface AccountDocument extends SanityDocument {
    _type: 'impact_page';
    foreground_image?: Poster;
}

export async function GET() {
    try {
        const impact_data = await client.fetch<AccountDocument>(`*[_type == "impact_page"][0]`)

        if (impact_data?.foreground_image?.asset?._ref) {
            impact_data.foreground_image.asset.image_url = urlForImage(impact_data.foreground_image.asset);
        }

        return NextResponse.json(impact_data)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
