'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWriteRole } from '@/shared/lib/auth'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import { headers } from 'next/headers'
import { logger } from '@/shared/config/logger'
import { logAudit } from '@/shared/lib/audit'
import { getBedById } from '@/features/bed-dashboard/lib/queries'
import { getTriageWardIds } from '@/features/bed-dashboard/lib/triage-wards'
import { updateBedStageInDB } from '@/features/bed-dashboard/lib/bed-mutations'
import { isValidTriageTransition } from '../lib/triage-state-machine'
import { TriageStageSet } from '../types/triage-types'

const updateTriageStageSchema = z.object({
  bedId: z.string().uuid(),
  toStageId: z.string().uuid(),
  toStageName: z.string().refine(name => TriageStageSet.has(name)),
})

type UpdateTriageStageInput = z.infer<typeof updateTriageStageSchema>;

export async function updateTriageBedStage(input: UpdateTriageStageInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await requireWriteRole('beds', {
    actionType: 'UPDATE',
    entityType: 'bed',
    entityId: input.bedId,
  })

  const result = updateTriageStageSchema.safeParse(input)
  if (!result.success) {
    return { success: false, error: 'Invalid input.' }
  }

  try {
    const [bed, triageWardIds] = await Promise.all([
      getBedById(result.data.bedId),
      getTriageWardIds()
    ])
    
    if (!bed) {
      return { success: false, error: 'Triage bed not found.' }
    }
    
    if (!bed.wardId || !triageWardIds.includes(bed.wardId)) {
      return { success: false, error: 'Bed is not in the Triage Area.' }
    }
    
    // Explicit protection: Can only triage if empty.
    // If bed is already in another stage (except Empty), it can't be reused for a new intake.
    if (result.data.toStageName === 'Triage Initial Treatment' && bed.currentStage?.name !== 'Triage Empty') {
       return { success: false, error: 'Cannot intake a patient on a non-empty triage bed.' }
    }

    const validation = isValidTriageTransition(bed.currentStage?.name, result.data.toStageName)
    if (!validation.isValid) {
      return { success: false, error: validation.reason }
    }

        const ipAddress = getClientIpFromHeaders(await headers())

    await updateBedStageInDB({
      bedId: result.data.bedId,
      toStageId: result.data.toStageId,
      toStageName: result.data.toStageName,
      changedByUserId: session.userId,
      ipAddress,
      notes: `Triage state change via Triage Dashboard.`,
    })

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'triage_bed_stage',
      entityId: result.data.bedId,
      performedBy: session.userId,
      changes: {
        from: bed.currentStage?.name,
        to: result.data.toStageName,
      },
      metadata: { source: 'triage-dashboard' },
      ipAddress,
    }).catch(err => logger.error('Failed to log triage audit event', err))

    revalidatePath('/triage')
    revalidatePath('/dashboard') // Also revalidate main dashboard in case it shows triage info

    return { success: true }
  } catch (error) {
    logger.error('Failed to update triage bed stage', error as Error, {
      bedId: result.data.bedId,
    })
    return { success: false, error: 'A server error occurred.' }
  }
}
