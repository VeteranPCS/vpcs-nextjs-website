import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image';
import { MovingYourLifeProps } from '@/services/militarySpouseService';

export async function GET() {
    try {
        const movingYourLife = await client.fetch<MovingYourLifeProps[]>(`*[_type == "moving_your_life"]`)

        movingYourLife.map((data) => {
            if (data?.logo?.asset?._ref) {
                data.logo.asset.image_url = urlForImage(data.logo.asset);
            }
        })

        return NextResponse.json(movingYourLife)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
