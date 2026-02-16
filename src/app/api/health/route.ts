import { NextResponse } from 'next/server';
import pool from '@/db';
import { config } from '@/shared/config/env';
import { performHealthCheck } from '@/shared/config/init';
import { logger } from '@/shared/config/logger';

// Force dynamic rendering - don't pre-render during build
// This prevents build-time errors when encrypted env vars aren't available
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Attempt a simple query to verify database connection
    await pool.query('SELECT 1');
    
    return NextResponse.json(
      { status: 'healthy', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database connection check failed:', error);
    
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
