import { NextResponse } from 'next/server';
import { client } from '../../../../sanity/lib/client';
import { SanityDocument } from '@sanity/client';
import { urlForImage } from '@/sanity/lib/image';

interface AccountDocument extends SanityDocument {
    _type: 'internship_benefits';
}

export async function GET() {
    try {
        const benefitItems = await client.fetch<AccountDocument>(`*[_type == "internship_benefits"][0]`);

        if (benefitItems.logo?.asset?._ref) {
            benefitItems.logo.asset.image_url = urlForImage(benefitItems.logo.asset); // Add the image URL to the response
        }

        return NextResponse.json(benefitItems);
    } catch (error) {
        console.error('Error fetching story posters:', error);
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 });
    }
}
