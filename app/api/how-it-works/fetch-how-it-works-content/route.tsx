import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { SanityDocument } from '@sanity/client';
import { urlForImage } from '@/sanity/lib/image';
import { HowItWorksContentProps } from '@/services/howItWorksService'; 

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const component = searchParams.get("component");
        const story = await client.fetch<HowItWorksContentProps>(`*[_type == "how_veterence_pcs_works" && header_slug.current == $component][0]`, { component });

        return NextResponse.json(story);
    } catch (error) {
        console.error('Error fetching story posters:', error);
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 });
    }
}
