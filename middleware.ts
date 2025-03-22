import { NextRequest, NextResponse } from "next/server"

// Example of base-specific redirects
export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone()

    // Map of common base search terms to appropriate state pages
    const baseRedirects: Record<string, string> = {
        'fort-bragg': '/north-carolina',
        'fort-hood': '/texas',
        'camp-pendleton': '/california',
        'naval-station-norfolk': '/virginia',
        'naval-station-corpus-christi': '/texas',
        'naval-station-san-diego': '/california',
        'naval-station-newport': '/rhode-island',
        // Add more bases
    }

    const path = url.pathname.toLowerCase().replace(/^\//, '')

    if (baseRedirects[path]) {
        url.pathname = baseRedirects[path]
        return NextResponse.redirect(url)
    }
}