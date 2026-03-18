import type { NextConfig } from "next";
import path from "path";

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
  // Fix: stray package-lock.json in parent directory confuses Next.js workspace root detection.
  // Explicitly set the output file tracing root to this project's directory.
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production'
    const enableHstsPreload = process.env.HSTS_PRELOAD === 'true'

    const sharedHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ]

    const productionOnlyHeaders = isProduction
      ? [
          { key: 'Content-Security-Policy', value: 'upgrade-insecure-requests' },
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
