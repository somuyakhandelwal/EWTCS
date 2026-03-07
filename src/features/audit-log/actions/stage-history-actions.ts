'use server'
// EPIC 12 — Audit Logs & Compliance
// US-12.2: Stage change history — server actions

import 'server-only'
import { z } from 'zod'
import { requireRole } from '@/shared/lib/auth'
import {
    getStageHistoryPage,
    type StageHistoryPage,
    type StageHistoryFilter,
} from '../lib/stage-history-queries'

const StageHistoryFilterSchema = z.object({
    bedId: z.string().uuid().optional(),
    stageId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(10).max(200).default(50),
})

export interface StageHistoryActionResult {
    success: boolean
    data?: StageHistoryPage
    error?: string
}

export async function getStageHistoryAction(
    input: StageHistoryFilter
): Promise<StageHistoryActionResult> {
    try {
        await requireRole(['admin', 'auditor'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }

    const parsed = StageHistoryFilterSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: 'Invalid filter parameters' }
    }

    try {
        const data = await getStageHistoryPage(parsed.data as StageHistoryFilter)
        return { success: true, data }
    } catch {
        return { success: false, error: 'Failed to load stage history' }
    }
}
