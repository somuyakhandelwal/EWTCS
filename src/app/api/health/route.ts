import { NextResponse } from 'next/server';
import { testConnection, getPoolStats } from '@/shared/lib/db';
import { getSystemMetrics } from '@/shared/lib/system-metrics';

// Force dynamic rendering — health data must always be live.
export const dynamic = 'force-dynamic';

/**
 * Enhanced health endpoint — EPIC 13: System Performance & Reliability.
 * Returns application status, DB connectivity, connection-pool utilisation, and system metrics.
 * Used by monitoring tools to detect SLA regressions and alert on DB issues.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  const dbReachable = await testConnection();
  const poolStats = getPoolStats();
  const systemMetrics = await getSystemMetrics();

  const status = dbReachable ? 'healthy' : 'degraded';
  const httpStatus = dbReachable ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp,
      system: systemMetrics,
      database: {
        reachable: dbReachable,
        pool: poolStats,
      },
    },
    { status: httpStatus }
  );
}
