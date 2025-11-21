import { NextRequest, NextResponse } from 'next/server';
import { extractBAHData, RANK_MAPPING, BAHData } from '@/lib/bah-scraper';

interface BAHRequest {
    year: string;
    zipCode: string;
    rank: string;
}

interface BAHResponse {
    success: boolean;
    data?: BAHData;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<BAHResponse>> {
    try {
        const { year, zipCode, rank }: BAHRequest = await request.json();

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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('BAH extraction error:', errorMessage);
        return NextResponse.json({ 
            success: false, 
            error: errorMessage 
        }, { status: 500 });
    }
}