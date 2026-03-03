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
};

export default nextConfig;
