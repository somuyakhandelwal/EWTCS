import { NextRequest, NextResponse } from 'next/server'
import { undoLastBedStageUpdate } from '@/features/bed-dashboard/actions/undo-actions'

export async function POST(req: NextRequest) {
  try {
    const { bedId } = await req.json()
    if (!bedId) {
      return NextResponse.json({ success: false, error: 'Missing bedId' }, { status: 400 })
    }

    const result = await undoLastBedStageUpdate({ bedId })
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}