import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { SanityDocument } from '@sanity/client';
import { urlForImage } from '@/sanity/lib/image';
import { HowBonusMoveInContentProps } from '@/services/howItWorksService';

export async function GET() {
    try {
        const story = await client.fetch<HowBonusMoveInContentProps>(`*[_type == "moveInBonus"][0]`);

        return NextResponse.json(story);
    } catch (error) {
        console.error('Error fetching story posters:', error);
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 });
    }
}
