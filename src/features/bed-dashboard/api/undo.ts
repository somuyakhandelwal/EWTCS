// API route for undoing last bed stage update
import { NextRequest, NextResponse } from 'next/server'
import { undoLastBedStageUpdate } from '../actions/undo-actions'

export async function POST(req: NextRequest) {
  try {
    const { bedId, prevStageId } = await req.json()
    if (!bedId || !prevStageId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 })
    }
    const result = await undoLastBedStageUpdate({ bedId, prevStageId })
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
