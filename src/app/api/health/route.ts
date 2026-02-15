import { NextResponse } from 'next/server';
import { config } from '@/lib/config/env';
import { performHealthCheck } from '@/lib/config/init';
import { logger } from '@/lib/config/logger';

/**
 * GET /api/health
 * Health check endpoint for monitoring system status
 * Returns detailed system health information
 * 
 * Useful for:
 * - Load balancer health checks
 * - External monitoring systems
 * - Kubernetes readiness/liveness probes
 * 
 * Response: 200 (healthy), 503 (degraded/unhealthy)
 */
export async function GET() {
  try {
    const health = await performHealthCheck();

    const statusCode = health.status === 'healthy' ? 200 : 503;
    const responseBody = {
      status: health.status,
      timestamp: health.timestamp,
      environment: config.app.environment,
      version: '0.1.0',
      checks: {
        configuration: health.checks.config ? 'pass' : 'fail',
        environment: health.checks.environment ? 'pass' : 'fail',
        database: health.checks.database ? 'pass' : 'fail',
      },
      ...(health.errors && health.errors.length > 0 && {
        errors: health.errors,
      }),
    };

    return NextResponse.json(responseBody, { status: statusCode });
  } catch (error) {
    logger.error('Health check endpoint failed', error as Error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check endpoint encountered an error',
      },
      { status: 503 }
    );
  }
}
