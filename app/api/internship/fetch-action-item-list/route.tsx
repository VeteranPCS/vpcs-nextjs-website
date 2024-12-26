import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { SanityDocument } from '@sanity/client';
import { urlForImage } from '@/sanity/lib/image';

interface AccountDocument extends SanityDocument {
    _type: 'internship_action';
    action_image?: {
        asset?: {
            _ref: string;
            image_url?: string; // Make sure image_url exists here
        };
    };
}

export async function GET() {
    try {
        const actionItems = await client.fetch<AccountDocument[]>(`*[_type == "internship_action"]`);
        
        actionItems.forEach((item: AccountDocument) => {
            if (item.action_image?.asset?._ref) {
                const imageUrl = urlForImage(item.action_image.asset);
                if (item.action_image.asset) {
                    item.action_image.asset.image_url = imageUrl;
                }
            }
        });

        return NextResponse.json(actionItems);
    } catch (error) {
        console.error('Error fetching story posters:', error);
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 });
    }
}
