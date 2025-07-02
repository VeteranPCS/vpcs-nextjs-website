import { NextResponse } from 'next/server';
import { extractBAHData, RANK_MAPPING } from '@/lib/bah-scraper';

export async function POST(request) {
    try {
        const { year, zipCode, rank } = await request.json();

        // Validate input
        if (!year || !zipCode || !rank) {
            return NextResponse.json({ 
                success: false,
                error: 'Missing required fields: year, zipCode, and rank are required' 
            }, { status: 400 });
        }

        if (!/^\d{5}$/.test(zipCode)) {
            return NextResponse.json({ 
                success: false,
                error: 'ZIP code must be exactly 5 digits' 
            }, { status: 400 });
        }

        if (!RANK_MAPPING[rank]) {
            return NextResponse.json({ 
                success: false,
                error: 'Invalid rank ID' 
            }, { status: 400 });
        }

        console.log(`BAH API request: year=${year}, zipCode=${zipCode}, rank=${rank}`);

        // Extract BAH data
        const result = await extractBAHData(year, zipCode, rank);

        console.log(`BAH extraction successful:`, result);

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('BAH extraction error:', error.message);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}