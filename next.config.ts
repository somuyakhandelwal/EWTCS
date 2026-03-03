import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  // US-13.5: pg and sub-packages use Node.js built-ins — mark as server externals
  // so webpack never tries to bundle them for client or Edge runtime builds.
  serverExternalPackages: [
    'pg',
    'pg-pool',
    'pg-types',
    'pg-connection-string',
    'pgpass',
    'pg-protocol',
  ],
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production'
    const enableHstsPreload = process.env.HSTS_PRELOAD === 'true'

    const sharedHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: 'upgrade-insecure-requests' },
    ]

    const productionOnlyHeaders = isProduction
      ? [
          {
            key: 'Strict-Transport-Security',
            value: enableHstsPreload
              ? 'max-age=31536000; includeSubDomains; preload'
              : 'max-age=31536000; includeSubDomains',
          },
        ]
      : []

    return [
      {
        source: '/:path*',
        headers: [...sharedHeaders, ...productionOnlyHeaders],
      },
    ]
  },
};

export default nextConfig;
