import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'

export async function GET() {
    try {
        const city_detail = await client.fetch(`*[_type == "city_list"]{ city_name, short_name }`);

        return NextResponse.json(city_detail)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
