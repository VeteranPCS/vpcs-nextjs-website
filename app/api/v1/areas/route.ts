import { NextRequest, NextResponse } from 'next/server';
import { attio } from '@/lib/attio';

interface AreaAssignment {
    name: string;
    slug: string;
}

interface AreasResponse {
    success: boolean;
    data?: AreaAssignment[];
    error?: string;
}

// Map state code to slug (e.g., "TX" -> "texas")
const stateCodeToSlug: { [key: string]: string } = {
    'AL': 'alabama', 'AK': 'alaska', 'AZ': 'arizona', 'AR': 'arkansas',
    'CA': 'california', 'CO': 'colorado', 'CT': 'connecticut', 'DE': 'delaware',
    'FL': 'florida', 'GA': 'georgia', 'HI': 'hawaii', 'ID': 'idaho',
    'IL': 'illinois', 'IN': 'indiana', 'IA': 'iowa', 'KS': 'kansas',
    'KY': 'kentucky', 'LA': 'louisiana', 'ME': 'maine', 'MD': 'maryland',
    'MA': 'massachusetts', 'MI': 'michigan', 'MN': 'minnesota', 'MS': 'mississippi',
    'MO': 'missouri', 'MT': 'montana', 'NE': 'nebraska', 'NV': 'nevada',
    'NH': 'new-hampshire', 'NJ': 'new-jersey', 'NM': 'new-mexico', 'NY': 'new-york',
    'NC': 'north-carolina', 'ND': 'north-dakota', 'OH': 'ohio', 'OK': 'oklahoma',
    'OR': 'oregon', 'PA': 'pennsylvania', 'PR': 'puerto-rico', 'RI': 'rhode-island',
    'SC': 'south-carolina', 'SD': 'south-dakota', 'TN': 'tennessee', 'TX': 'texas',
    'UT': 'utah', 'VT': 'vermont', 'VA': 'virginia', 'WA': 'washington',
    'DC': 'washington-dc', 'WV': 'west-virginia', 'WI': 'wisconsin', 'WY': 'wyoming'
};

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/areas?state=TX
 *
 * Returns all areas in a state from Attio.
 * More efficient than deriving from agent assignments.
 */
export async function GET(request: NextRequest): Promise<NextResponse<AreasResponse>> {
    try {
        const stateCode = request.nextUrl.searchParams.get('state');

        if (!stateCode) {
            return NextResponse.json({
                success: false,
                error: 'State parameter is required'
            }, { status: 400 });
        }

        console.log(`Fetching areas for state: ${stateCode}`);

        // 1. Get the state record by state_code
        const states = await attio.queryRecords('states', {
            filter: { state_code: { $eq: stateCode.toUpperCase() } },
            limit: 1
        });

        if (!states.length) {
            console.log(`No state found for code: ${stateCode}`);
            return NextResponse.json({
                success: true,
                data: []
            });
        }

        const stateId = states[0].id;

        // 2. Get all areas in this state
        const areas = await attio.queryRecords('areas', {
            filter: { state: { $eq: stateId } }
        });

        // 3. Convert to sorted array with slugs
        const sortedAreas: AreaAssignment[] = areas
            .map((area: any) => ({
                name: area.name,
                slug: slugify(area.name)
            }))
            .sort((a: AreaAssignment, b: AreaAssignment) => a.name.localeCompare(b.name));

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

/**
 * Create URL-safe slug from area name
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}
