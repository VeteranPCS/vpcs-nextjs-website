import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { SanityDocument } from '@sanity/client';
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
    _type: 'stories_poster';
    poster_1?: Poster;
    poster_2?: Poster;
}

export async function GET() {
    try {
        const story = await client.fetch<AccountDocument>(`*[_type == "stories_poster"][0]`);

        if (story?.poster_1?.asset?._ref) {
            story.poster_1.asset.image_url = urlForImage(story.poster_1.asset);
        }

        if (story?.poster_2?.asset?._ref) {
            story.poster_2.asset.image_url = urlForImage(story.poster_2.asset);
        }

        return NextResponse.json(story);
    } catch (error) {
        console.error('Error fetching story posters:', error);
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 });
    }
}
