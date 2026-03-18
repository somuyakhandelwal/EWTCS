import { NextResponse } from 'next/server'
import { recordRequest } from '@/shared/lib/system-metrics'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value
  
  // Provide the session token (or 'anonymous' if none) to track distinct users
  recordRequest(sessionToken || 'anonymous-user')
  
  return NextResponse.json({ success: true })
}
