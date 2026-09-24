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
    ],
  },
  // Prevent edge-runtime bundling of Node-only packages used in API routes
  serverExternalPackages: ['cheerio', 'playwright-core'],
}

export default nextConfig
