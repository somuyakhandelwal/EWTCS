import { NextResponse } from 'next/server'
import { verifySession } from '@/shared/lib/session'
import { getBedGridData } from '@/features/bed-dashboard/actions/bed-grid-actions'

export async function GET() {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await getBedGridData()
    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Failed to fetch snapshot' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result.data, timestamp: Date.now() })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}