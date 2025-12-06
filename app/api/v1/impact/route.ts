import { NextResponse } from 'next/server';
import { getAllImpactMetrics } from '@/services/salesforceImpactService';

interface ImpactMetricsResponse {
    success: boolean;
    data?: {
        cashBackAmount: string;
        charityAmount: string;
        totalVolumeSold: string;
    };
    error?: string;
}

// Cache the response for 5 minutes
export const revalidate = 300;

export async function GET(): Promise<NextResponse<ImpactMetricsResponse>> {
    try {
        const metrics = await getAllImpactMetrics();

        return NextResponse.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Impact API error:', errorMessage);

        // Return fallback values even on error so the UI still works
        return NextResponse.json({
            success: true,
            data: {
                cashBackAmount: '$500,000',
                charityAmount: '$50,000',
                totalVolumeSold: '$189 Million',
            }
        });
    }
}

