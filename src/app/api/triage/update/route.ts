import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/shared/config/logger'
import { updateBedTriageInfo } from '@/features/bed-dashboard/actions/triage-actions'

export const dynamic = 'force-dynamic'

type TriagePayload = {
  bedId: string
  triageData: {
    patientUhid: string
    patientIpdId?: string | null
    patientName: string
    patientAge: number
    patientGender: 'Male' | 'Female' | 'Other' | 'Unknown'
    keySymptom: string
    triageCategory: 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent'
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as TriagePayload
    if (!payload?.bedId || !payload?.triageData) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const result = await updateBedTriageInfo(payload.bedId, payload.triageData)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('POST /api/triage/update failed', error as Error)
    return NextResponse.json({ success: false, error: 'Failed to update triage info' }, { status: 500 })
  }
}
