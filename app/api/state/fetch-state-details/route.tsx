import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'
import { CityList } from '@/services/stateService';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const city = searchParams.get("city");

        const city_detail = await client.fetch<CityList>(`*[_type == "city_list" && city_slug.current == $city][0]`, { city });

        if (city_detail.city_map?.asset?._ref) {
            city_detail.city_map.asset.image_url = urlForImage(city_detail.city_map.asset);  // Add the image URL to the response
        }

        return NextResponse.json(city_detail)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
