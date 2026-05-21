import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/shared/config/logger'

export const dynamic = 'force-dynamic'

const HelpEventSchema = z.object({
  eventType: z.enum(['open', 'close', 'search', 'start_tour', 'finish_tour']),
  routeKey: z.string().min(1).max(120),
  query: z.string().max(120).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = HelpEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { eventType, routeKey, query } = parsed.data

    logger.info('Help event tracked', {
      eventType,
      routeKey,
      queryLength: query?.length ?? 0,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Help event logging failed', error as Error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
