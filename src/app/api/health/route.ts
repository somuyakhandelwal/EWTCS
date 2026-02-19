import { NextResponse } from 'next/server';

// Force dynamic rendering - don't pre-render during build
// This prevents build-time errors when encrypted env vars aren't available
export const dynamic = 'force-dynamic';

export async function GET() {
  // Simple health check without database access to avoid decryption during build
  return NextResponse.json(
    { status: 'healthy', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
