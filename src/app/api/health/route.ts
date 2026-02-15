import { NextResponse } from 'next/server';
import pool from '@/db';

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
