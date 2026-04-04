import { z } from 'zod'

export const OPERATION_TYPES = ['stage-update', 'discharge', 'disposition-reason'] as const

export const enqueueSchema = z.object({
  operationType: z.enum(OPERATION_TYPES),
  clientOperationId: z.string().trim().min(1).max(120),
  payload: z.record(z.string(), z.unknown()),
  enqueuedAt: z.string().datetime().optional(),
  localId: z.string().optional(),
})

export const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['drained', 'failed']),
  errorMessage: z.string().trim().max(2000).optional(),
})

export type QueueRow = {
  id: string
  client_operation_id: string
  operation_type: string
  payload: unknown
  enqueued_at: string
  drained_at: string | null
  failed_at: string | null
  error_message: string | null
}

export function isOperationalRole(role: string) {
  return ['nurse', 'housekeeping', 'supervisor', 'admin', 'doctor'].includes(role)
}

export const MONITOR_SELECT_SQL = `SELECT
   oq.id,
   oq.user_id,
   u.username,
   oq.operation_type,
   oq.payload,
   oq.enqueued_at,
   oq.failed_at,
   oq.error_message,
   b.id AS bed_id,
   b.bed_number,
   b.ward_id,
   w.name AS ward_name,
   CASE
     WHEN oq.failed_at IS NOT NULL THEN 'failed'
     ELSE 'pending'
   END AS status
 FROM offline_queue oq
 INNER JOIN users u ON u.id = oq.user_id
 LEFT JOIN beds b ON b.id = (
   CASE
     WHEN (oq.payload->>'bedId') ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
       THEN (oq.payload->>'bedId')::uuid
     ELSE NULL
   END
 )
 LEFT JOIN wards w ON w.id = b.ward_id
 WHERE oq.drained_at IS NULL
   AND ($1::uuid IS NULL OR b.ward_id = $1::uuid)
 ORDER BY oq.failed_at DESC NULLS LAST, oq.enqueued_at ASC
 LIMIT $2`
