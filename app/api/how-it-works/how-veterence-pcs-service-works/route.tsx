import { NextResponse } from 'next/server';
import { client } from '../../../../sanity/lib/client';
import { SanityDocument } from '@sanity/client';
import { urlForImage } from '@/sanity/lib/image';

interface AccountDocument extends SanityDocument {
    _type: 'howVeterencePCSServiceWorks';
}

export async function GET() {
    try {
        const story = await client.fetch<AccountDocument>(`*[_type == "howVeterencePCSServiceWorks"][0]`);

        console.log(story)
        return NextResponse.json(story);
    } catch (error) {
        console.error('Error fetching story posters:', error);
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 });
    }
}
