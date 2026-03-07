// AI Summary Generation — Cron API Route
// EPIC 9 US-9.1: Called automatically at midnight by an external scheduler
// (e.g. Vercel Cron, GitHub Actions, cloud scheduler).
// Protected by a bearer token (CRON_SECRET env var).

import { NextRequest, NextResponse } from 'next/server'
import { aggregateDailyStats } from '@/features/ai-summary/lib/aggregate-stats'
import { generateAISummary } from '@/features/ai-summary/lib/openai-client'
import { upsertSummary } from '@/features/ai-summary/lib/summary-mutations'
import { logger } from '@/shared/config/logger'

function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  // Verify cron secret (CRON_SECRET env var)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization') ?? ''
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const url  = new URL(req.url)
  const date = url.searchParams.get('date') ?? yesterday()

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format, expected YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const stats    = await aggregateDailyStats(new Date(`${date}T00:00:00Z`))
    const aiResult = await generateAISummary(stats)
    const id       = await upsertSummary(stats, aiResult)

    logger.info(`Cron: generated summary ${id} for ${date}`)
    return NextResponse.json({ ok: true, summaryId: id, date })
  } catch (error) {
    logger.error('Cron summary generation failed', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
