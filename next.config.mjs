import { withBotId } from 'botid/next/config';

// Content-Security-Policy. Two enforced policies, scoped by path:
//  - siteCsp:   every route EXCEPT /studio (marketing pages, blog, /api).
//  - studioCsp: the embedded Sanity Studio (/studio), which additionally needs
//               'unsafe-eval', blob: workers, and live wss:// connections.
// script-src/style-src keep 'unsafe-inline' because Next.js emits inline
// hydration/bootstrap scripts and the app injects runtime styles (styled-jsx,
// emotion/MUI, styled-components, AOS); a nonce cannot cover those cleanly here.
// Salesforce/Slack/OpenPhone/Anthropic are server-side only, so they are not
// listed in connect-src (the browser only ever talks to first-party endpoints).
const siteCsp = `
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  form-action 'self';
  frame-ancestors 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://va.vercel-scripts.com https://us-assets.i.posthog.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://cdn.sanity.io https://veteranpcs.my.salesforce.com https://lh3.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com;
  font-src 'self' data:;
  connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://us.posthog.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://vitals.vercel-insights.com;
  frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.googletagmanager.com;
  worker-src 'self' blob:;
  upgrade-insecure-requests;
`;

const studioCsp = `
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://cdn.sanity.io https://*.sanity.io;
  font-src 'self' data:;
  connect-src 'self' https://*.api.sanity.io https://*.apicdn.sanity.io https://api.sanity.io https://*.sanity.io wss://*.api.sanity.io https://us.i.posthog.com https://us-assets.i.posthog.com https://us.posthog.com;
  frame-src 'self' https://*.sanity.io;
  worker-src 'self' blob:;
`;

const toCspHeaderValue = (csp) => csp.replace(/\s{2,}/g, ' ').trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          // NOTE: no Access-Control-Allow-Credentials — it is invalid (and a
          // security smell) alongside a wildcard Access-Control-Allow-Origin.
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      },
      {
        // Relaxed CSP for the embedded Sanity Studio only.
        source: "/studio/:path*",
        headers: [
          { key: "Content-Security-Policy", value: toCspHeaderValue(studioCsp) },
        ]
      },
      {
        // Enforced CSP for every route except /studio (which is handled above).
        // The negative lookahead keeps Studio from receiving a second, stricter
        // CSP header (browsers enforce the intersection of multiple CSP headers).
        source: "/((?!studio).*)",
        headers: [
          { key: "Content-Security-Policy", value: toCspHeaderValue(siteCsp) },
        ]
      }
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'veteranpcs.my.salesforce.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 2678400, // 31 days
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: "/blog/us-military-bases/:path*/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
      {
        source: "/blog/va-loan-help/:path*/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
      {
        source: "/blog/pcs-help/:path*/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
      {
        source: "/blog/military-transition-help/:path*/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
      {
        source: "/blog/things-to-do/:path*/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
      {
        source: "/sitemap_index.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/main',
        destination: '/',
        permanent: true,
      },
      {
        source: '/(new|old|backup|bk|bc|wp|wordpress|feed)',
        destination: '/',
        permanent: true,
      },

      {
        source: '/blog/what-military-bases-are-in-colorado-2',
        destination: '/blog/what-military-bases-are-in-colorado',
        permanent: true,
      },
      {
        source: '/what-military-bases-are-in-colorado-2',
        destination: '/blog/what-military-bases-are-in-colorado',
        permanent: true,
      },
      {
        source: '/blog/best-places-to-live-near-ft-eisenhower-augusta-georgia-veteranpcs',
        destination: '/blog/best-places-to-live-near-ft-gordon-augusta-georgia',
        permanent: true,
      },
      {
        source: '/blog/best-places-to-live-near-fort-moore-a-comprehensive-guide-for-pcsing-military-personnel',
        destination: '/blog/best-places-to-live-near-fort-benning',
        permanent: true,
      },
      {
        source: '/blog/best-places-to-live-near-fort-cavazos-fort-hood',
        destination: '/blog/best-places-to-live-near-fort-hood',
        permanent: true,
      },
    ]
  }
};

export default withBotId(nextConfig);
