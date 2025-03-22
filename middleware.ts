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

    // Handle redirects
    if (baseRedirects[path]) {
        url.pathname = baseRedirects[path]
        return NextResponse.redirect(url)
    }

    // For API routes, ensure proper headers
    if (url.pathname.startsWith('/api/')) {
        const response = NextResponse.next()

        // Add CORS headers
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

        return response
    }

    // For all other routes, continue without modification
    return NextResponse.next()
}

// Configure which routes should trigger the middleware
export const config = {
    matcher: [
        // Match all API routes
        '/api/:path*',
        // Match base redirects
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}