'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/shared/lib/db'
import { requireWriteRole } from '@/shared/lib/auth'

// Store triage info into beds.metadata JSONB
export async function updateBedTriageInfo(
  bedId: string,
  triageData: {
    patientUhid: string
    patientName: string
    keySymptom: string
    triageCategory: 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent'
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireWriteRole('beds')
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Since we're merging metadata, we do a jsonb_set or just read/write.
    // For simplicity, we'll read current metadata, modify, and write,
    // or use Postgres jsonb_set logic.
    // Let's read first (safer to preserve existing metadata).
    const bedResult = await query<{ metadata: Record<string, unknown> }>('SELECT metadata FROM beds WHERE id = $1', [bedId])
    if (bedResult.rows.length === 0) {
      return { success: false, error: 'Bed not found' }
    }

    const currentMetadata = bedResult.rows[0].metadata || {}
    const newMetadata = {
      ...currentMetadata,
      triageInfo: {
        patientUhid: triageData.patientUhid,
        patientName: triageData.patientName,
        keySymptom: triageData.keySymptom,
        triageCategory: triageData.triageCategory
      }
    }

    await query('UPDATE beds SET metadata = $1, updated_at = NOW() WHERE id = $2', [newMetadata, bedId])

    revalidatePath('/dashboard')
    revalidatePath('/supervisor')
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return { success: false, error: 'Internal server error' }
  }
}
