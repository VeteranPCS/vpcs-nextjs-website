import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'
import { StateList } from '@/services/stateService';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const state = searchParams.get("state");

        const state_detail = await client.fetch<StateList>(`*[_type == "city_list" && city_slug.current == $city][0]`, { city: state });

        if (state_detail.city_map?.asset?._ref) {
            state_detail.city_map.asset.image_url = urlForImage(state_detail.city_map.asset);  // Add the image URL to the response
        }

        return NextResponse.json(state_detail)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
