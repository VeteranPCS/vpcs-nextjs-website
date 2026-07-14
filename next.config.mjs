import { withBotId } from 'botid/next/config';

// Content-Security-Policy, enforced on every route.
// script-src/style-src keep 'unsafe-inline' because Next.js emits inline
// hydration/bootstrap scripts and the app injects runtime styles (styled-jsx,
// emotion/MUI, styled-components, AOS); a nonce cannot cover those cleanly here.
// Salesforce/Slack/OpenPhone/Anthropic are server-side only, so they are not
// listed in connect-src (the browser only ever talks to first-party endpoints).
//
// GTM is a tag LOADER: it injects third-party tags at runtime that a static
// allowlist can't infer. The tags live on production today — Microsoft Clarity
// (*.clarity.ms), Ahrefs Analytics (analytics.ahrefs.com) and the Google Ads /
// DoubleClick conversion + remarketing stack — so they are allowlisted here to
// avoid breaking anything that works now. The doubleclick.net / googlesyndication
// families are wildcarded ONLY in the non-script directives (they can't execute
// code there); script-src stays pinned to specific origins. Vercel's preview
// toolbar (vercel.live) is intentionally NOT listed — it is preview-only, not a
// production dependency.
const siteCsp = `
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  form-action 'self';
  frame-ancestors 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://va.vercel-scripts.com https://us-assets.i.posthog.com https://www.clarity.ms https://*.clarity.ms https://analytics.ahrefs.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://adservice.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://veteranpcs.my.salesforce.com https://lh3.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com https://*.clarity.ms https://www.google.com https://*.doubleclick.net https://*.g.doubleclick.net https://pagead2.googlesyndication.com https://www.googleadservices.com;
  font-src 'self' data:;
  connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://us.posthog.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://vitals.vercel-insights.com https://*.clarity.ms https://analytics.ahrefs.com https://www.google.com https://*.doubleclick.net https://*.g.doubleclick.net https://www.googleadservices.com https://pagead2.googlesyndication.com https://ade.googlesyndication.com https://cct.google;
  frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.googletagmanager.com https://*.doubleclick.net https://*.g.doubleclick.net https://www.googleadservices.com https://www.google.com;
  worker-src 'self' blob:;
  upgrade-insecure-requests;
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
          },
          // Enforced CSP for every route.
          { key: "Content-Security-Policy", value: toCspHeaderValue(siteCsp) },
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
      }
    ]
  },
  images: {
    remotePatterns: [
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
