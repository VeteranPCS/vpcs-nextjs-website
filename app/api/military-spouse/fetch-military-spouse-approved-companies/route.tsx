import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image';
import { MilitarySpouseApprovedCompaniesProps } from '@/services/militarySpouseService';

export async function GET() {
    try {
        const movingYourLife = await client.fetch<MilitarySpouseApprovedCompaniesProps[]>(`*[_type == "approved_company_list"]`)

        movingYourLife.map((data) => {
            if (data?.image?.asset?._ref) {
                data.image.asset.image_url = urlForImage(data.image.asset);
            }
        })

        return NextResponse.json(movingYourLife)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
