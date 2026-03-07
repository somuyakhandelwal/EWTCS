/**
 * External REST API — Bed Status
 * US-19.1: REST API for External Systems
 *
 * GET /api/v1/beds
 *   Returns current status of all active beds (read-only, anonymised).
 *   Authentication: Bearer <EXTERNAL_API_KEY>
 *
 * Response: application/json
 * {
 *   beds: BedStatusEntry[]
 *   generatedAt: string   // ISO timestamp
 * }
 */

import { type NextRequest, NextResponse } from 'next/server'
import { verifyApiKey, type ApiKeyAuthFail } from '@/shared/lib/api-key-auth'
import { checkRateLimit } from '@/shared/lib/rate-limit'
import pool from '@/shared/lib/db'

interface BedStatusEntry {
  id: string
  bedNumber: string
  ward: string | null
  currentStage: string | null
  currentStageColor: string | null
  isOccupied: boolean
  isDelayed: boolean
  elapsedMinutes: number | null
}

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = verifyApiKey(request)
  if (!auth.ok) {
    return (auth as ApiKeyAuthFail).response
  }

  // Rate limit: 60 req/min per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please retry after the reset window.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.resetAt - Math.floor(Date.now() / 1000)),
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.resetAt),
        },
      }
    )
  }

  try {
    const result = await pool.query<{
      id: string
      bed_number: string
      ward_name: string | null
      stage_name: string | null
      stage_color: string | null
      is_occupied: boolean
      patient_start_time: Date | null
    }>(
      `SELECT
         b.id,
         b.bed_number,
         w.name                                                    AS ward_name,
         s.name                                                    AS stage_name,
         s.color_code                                              AS stage_color,
         b.is_occupied,
         b.patient_start_time
       FROM beds b
       LEFT JOIN wards w ON w.id = b.ward_id
       LEFT JOIN stages s ON s.id = b.current_stage_id
       WHERE b.is_active = true
       ORDER BY b.bed_number`
    )

    const DELAY_THRESHOLD_MS = 3 * 60 * 60 * 1000  // 3 hours default

    const beds: BedStatusEntry[] = result.rows.map((row) => {
      const elapsedMs = row.is_occupied && row.patient_start_time
        ? Date.now() - new Date(row.patient_start_time).getTime()
        : null

      return {
        id: row.id,
        bedNumber: row.bed_number,
        ward: row.ward_name,
        currentStage: row.stage_name,
        currentStageColor: row.stage_color,
        isOccupied: row.is_occupied,
        isDelayed: elapsedMs !== null && elapsedMs > DELAY_THRESHOLD_MS,
        elapsedMinutes: elapsedMs !== null ? Math.floor(elapsedMs / 60000) : null,
      }
    })

    return NextResponse.json(
      { beds, generatedAt: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
