import { NextRequest, NextResponse } from 'next/server';
import stateService from '@/services/stateService';

interface AreaAssignment {
    name: string;
    slug: string;
}

interface AreasResponse {
    success: boolean;
    data?: AreaAssignment[];
    error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<AreasResponse>> {
    try {
        const { searchParams } = new URL(request.url);
        const stateCode = searchParams.get('state');

        if (!stateCode) {
            return NextResponse.json({
                success: false,
                error: 'State parameter is required'
            }, { status: 400 });
        }

        console.log(`Fetching areas for state: ${stateCode}`);

        // Fetch agents data from Salesforce (server-side)
        const agentsData = await stateService.fetchAgentsListByState(stateCode);

        // Extract unique area names from all agents in this state
        const uniqueAreas = new Set<string>();
        agentsData.records.forEach(agent => {
            const areaAssignments = agent.Area_Assignments__r?.records || [];
            areaAssignments.forEach(assignment => {
                // Filter areas for the specific state
                if (assignment.Area__r.State__c.toLowerCase() === getStateNameFromAbbreviation(stateCode).toLowerCase()) {
                    uniqueAreas.add(assignment.Area__r.Name);
                }
            });
        });

        // Convert to sorted array with slugs
        const sortedAreas: AreaAssignment[] = Array.from(uniqueAreas)
            .sort()
            .map(area => ({
                name: area,
                slug: area.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            }));

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

// Helper function to get state name from abbreviation
function getStateNameFromAbbreviation(abbr: string): string {
    const stateMap: { [key: string]: string } = {
        'AL': 'alabama', 'AK': 'alaska', 'AZ': 'arizona', 'AR': 'arkansas',
        'CA': 'california', 'CO': 'colorado', 'CT': 'connecticut', 'DE': 'delaware',
        'FL': 'florida', 'GA': 'georgia', 'HI': 'hawaii', 'ID': 'idaho',
        'IL': 'illinois', 'IN': 'indiana', 'IA': 'iowa', 'KS': 'kansas',
        'KY': 'kentucky', 'LA': 'louisiana', 'ME': 'maine', 'MD': 'maryland',
        'MA': 'massachusetts', 'MI': 'michigan', 'MN': 'minnesota', 'MS': 'mississippi',
        'MO': 'missouri', 'MT': 'montana', 'NE': 'nebraska', 'NV': 'nevada',
        'NH': 'new hampshire', 'NJ': 'new jersey', 'NM': 'new mexico', 'NY': 'new york',
        'NC': 'north carolina', 'ND': 'north dakota', 'OH': 'ohio', 'OK': 'oklahoma',
        'OR': 'oregon', 'PA': 'pennsylvania', 'PR': 'puerto rico', 'RI': 'rhode island',
        'SC': 'south carolina', 'SD': 'south dakota', 'TN': 'tennessee', 'TX': 'texas',
        'UT': 'utah', 'VT': 'vermont', 'VA': 'virginia', 'WA': 'washington',
        'DC': 'district of columbia', 'WV': 'west virginia', 'WI': 'wisconsin', 'WY': 'wyoming'
    };
    return stateMap[abbr] || abbr.toLowerCase();
}
