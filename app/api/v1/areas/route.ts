import { NextRequest, NextResponse } from 'next/server';
import { buildCoverageIndexForState } from '@/lib/ai/routing/coverage';

interface AreaAssignment {
    name: string;
    slug: string;
}

interface AreasResponse {
    // `success` is optional so the 400 "Invalid state code" guard can return a
    // bare `{ error }` body; every other response still sets it explicitly.
    success?: boolean;
    data?: AreaAssignment[];
    error?: string;
}

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse<AreasResponse>> {
    try {
        const stateCode = request.nextUrl.searchParams.get('state');

        if (!stateCode) {
            return NextResponse.json({
                success: false,
                error: 'State parameter is required'
            }, { status: 400 });
        }

        // Edge-layer defense (in addition to the service-layer validation in
        // stateService): only a 2-letter state code is ever a valid input.
        // Anything else is rejected before it can reach the SOQL builder.
        if (!/^[A-Za-z]{2}$/.test(stateCode)) {
            return NextResponse.json({
                error: 'Invalid state code'
            }, { status: 400 });
        }

        const coverageAreas = await buildCoverageIndexForState(stateCode);
        const sortedAreas: AreaAssignment[] = coverageAreas
            .map(area => ({
                name: area.areaName,
                slug: area.slug
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Found ${sortedAreas.length} areas for ${stateCode}`);

        return NextResponse.json({
            success: true,
            data: sortedAreas
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Areas API error:', errorMessage);
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
