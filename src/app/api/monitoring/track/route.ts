import { NextResponse } from 'next/server'
import { recordRequest } from '@/shared/lib/system-metrics'
import { cookies } from 'next/headers'
import type { BrowserTrackingPayload } from '@/shared/types/browser-compat.types'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value
  let payload: BrowserTrackingPayload = {}

  try {
    payload = (await request.json()) as BrowserTrackingPayload
  } catch {
    payload = {}
  }

  // Provide the session token (or 'anonymous' if none) to track distinct users
  recordRequest(sessionToken || 'anonymous-user', {
    browserFamily: payload.browserFamily,
    browserVersion: payload.browserVersion,
    compatibilityTier: payload.compatibilityTier,
  })

  return NextResponse.json({ success: true })
}
