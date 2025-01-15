/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
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
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
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
  },
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
    ]
  }
};

export default nextConfig;
