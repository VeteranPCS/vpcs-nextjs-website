import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image';
import { MilitarySpouseApprovedProps } from '@/services/militarySpouseService';

export async function GET() {
    try {
        const movingYourLife = await client.fetch<MilitarySpouseApprovedProps>(`*[_type == "military_spouse_approved"][0]`)

        if (movingYourLife?.image?.asset?._ref) {
            movingYourLife.image.asset.image_url = urlForImage(movingYourLife.image.asset);
        }

        return NextResponse.json(movingYourLife)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
