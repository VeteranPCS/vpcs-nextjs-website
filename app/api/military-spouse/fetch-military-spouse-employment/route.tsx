import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image';
import { EmploymentDataProps } from '@/services/militarySpouseService';

export async function GET() {
    try {
        const employmentData = await client.fetch<EmploymentDataProps[]>(`*[_type == "military_spouse_employment"]`)

        employmentData.map((employment) => {
            if (employment?.logo?.asset?._ref) {
                employment.logo.asset.image_url = urlForImage(employment.logo.asset);
            }
        })

        return NextResponse.json(employmentData)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching User Images' }, { status: 500 })
    }
}
