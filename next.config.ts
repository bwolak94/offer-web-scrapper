import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Otodom CDN
      {
        protocol: 'https',
        hostname: 'ireland.apollo.olxcdn.com',
      },
      // OLX images
      {
        protocol: 'https',
        hostname: '*.olx.pl',
      },
      // Morizon images
      {
        protocol: 'https',
        hostname: '*.morizon.pl',
      },
      {
        protocol: 'https',
        hostname: 'img.morizon.pl',
      },
      // Gratka
      {
        protocol: 'https',
        hostname: '*.gratka.pl',
      },
      // Nocleg.pl CDN
      {
        protocol: 'https',
        hostname: '*.nocleg.pl',
      },
      // Pracuj.pl CDN
      {
        protocol: 'https',
        hostname: '*.pracuj.pl',
      },
    ],
  },
  // Prevent edge-runtime bundling of Node-only packages used in API routes
  serverExternalPackages: ['cheerio', 'playwright-core', 'puppeteer-core', 'JSONStream'],

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Clickjacking protection
          { key: 'X-Frame-Options', value: 'DENY' },
          // MIME type sniffing protection
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // HTTPS enforcement (HSTS) — 1 year
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable unused browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://ireland.apollo.olxcdn.com https://*.olxcdn.com https://*.olx.pl https://*.morizon.pl https://img.morizon.pl https://*.gratka.pl https://*.nocleg.pl https://*.pracuj.pl",
              "connect-src 'self' https://*.vercel-insights.com https://*.vercel-analytics.com https://vitals.vercel-insights.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      // API routes: block content sniffing and caching
      {
        source: '/api/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
