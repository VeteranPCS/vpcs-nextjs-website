import { NextRequest, NextResponse } from 'next/server';
import { extractBAHData, RANK_MAPPING, BAHData } from '@/lib/bah-scraper';
import { toFourDigitYear } from '@/lib/bah-scraper-core.mjs';
import { bahLimiter } from '@/lib/rate-limit';
import { ipFromHeaders } from '@/lib/spam-protection';

export const runtime = 'nodejs';

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

/**
 * The BAH calculator UI sends a 2-digit calendar year (e.g. `"26"`), and the DTMO
 * scraper also accepts a 4-digit year (it converts to the 2-digit wire format
 * itself via `toDtmoYear`). Accept EITHER exact shape and reject everything else,
 * which still blocks injection payloads (e.g. `2026 OR 1=1`). Bound the normalized
 * 4-digit value to the window DTMO actually publishes: the current year ± 1.
 */
function isValidBahYear(year: string): boolean {
    if (!/^(\d{2}|\d{4})$/.test(year)) return false;
    const value = Number(toFourDigitYear(year));
    const current = new Date().getFullYear();
    return value >= current - 1 && value <= current + 1;
}

export async function POST(request: NextRequest): Promise<NextResponse<BAHResponse>> {
    try {
        // Rate-limit by caller IP before any parsing/scraping work.
        const ip = ipFromHeaders(request.headers);
        const limit = await bahLimiter.limit(ip);
        if (!limit.success) {
            const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
            return NextResponse.json({
                success: false,
                error: 'Too many requests',
            }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
        }

        const { year, zipCode, rank }: BAHRequest = await request.json();

        // Validate input
        if (!year || !zipCode || !rank) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: year, zipCode, and rank are required'
            }, { status: 400 });
        }

        if (!isValidBahYear(year)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid year',
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