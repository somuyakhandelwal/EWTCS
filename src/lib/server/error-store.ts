// US-13.5: Error monitoring store — persists ERROR/CRITICAL events to the DB,
// fires webhook alerts on ERROR/CRITICAL, and provides trend query helpers.
// Called lazily by logger.ts (fire-and-forget) so it never throws back to callers.

import { query } from '@/shared/lib/db'
import https from 'https'
import http from 'http'

export type ErrorLevel = 'WARN' | 'ERROR' | 'CRITICAL'

export type ErrorCategory =
  | 'auth' | 'database' | 'api' | 'backup' | 'system'

export interface ErrorEvent {
  id: string
  level: ErrorLevel
  category: ErrorCategory
  message: string
  stack?: string
  context: Record<string, unknown>
  acknowledged: boolean
  created_at: string
}

export interface ErrorSummary {
  last24h: { total: number; critical: number; error: number; warn: number }
  last7d:  { total: number; critical: number; error: number; warn: number }
  unacknowledged: number
}

// ─── Infer category from message/context heuristics ──────────────────────────
function inferCategory(message: string): ErrorCategory {
  const m = message.toLowerCase()
  if (m.includes('auth') || m.includes('login') || m.includes('logout') || m.includes('session')) return 'auth'
  if (m.includes('database') || m.includes('query') || m.includes('pool') || m.includes('pg')) return 'database'
  if (m.includes('backup') || m.includes('restore')) return 'backup'
  if (m.includes('api') || m.includes('route') || m.includes('request')) return 'api'
  return 'system'
}

// ─── Webhook alert (mirrors backup alert pattern) ────────────────────────────
function sendAlert(level: ErrorLevel, message: string): void {
  const url = process.env.ERROR_ALERT_WEBHOOK_URL
  if (!url) return
  try {
    const { hostname, port, pathname, search, protocol } = new URL(url)
    const body = JSON.stringify({ text: `[EWTCS] ${level} — ${message}` })
    const opts = {
      hostname, port: port || undefined,
      path: pathname + (search || ''), method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }
    const mod = protocol === 'https:' ? https : http
    const req = mod.request(opts, () => {})
    req.on('error', () => {})
    req.write(body); req.end()
  } catch { /* best-effort */ }
}

// ─── Persist to DB — fire-and-forget, never throws ─────────────────────────
export function captureError(
  level: ErrorLevel,
  message: string,
  error?: Error,
  context?: Record<string, unknown>,
): void {
  const category = inferCategory(message)
  const stack    = error?.stack ?? undefined
  const ctx      = context ?? {}

  // Fire alert for ERROR and CRITICAL immediately (synchronous, non-blocking)
  if (level === 'ERROR' || level === 'CRITICAL') {
    sendAlert(level, message)
  }

  // Persist asynchronously — intentionally not awaited
  query(
    `INSERT INTO error_events (level, category, message, stack, context)
     VALUES ($1, $2, $3, $4, $5)`,
    [level, category, message, stack ?? null, JSON.stringify(ctx)],
  ).catch(() => { /* DB unavailable — already logged to console by logger */ })
}

// ─── Summary counts for dashboard trends ────────────────────────────────────
export async function getErrorSummary(): Promise<ErrorSummary> {
  const countRows = await query<{ level: string; period: string; cnt: string }>(`
    SELECT level,
           CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN '24h' ELSE '7d' END AS period,
           COUNT(*)::text AS cnt
    FROM   error_events
    WHERE  created_at >= NOW() - INTERVAL '7 days'
    GROUP  BY level, period
  `)

  const acc = { last24h: { total:0,critical:0,error:0,warn:0 }, last7d: { total:0,critical:0,error:0,warn:0 } }
  for (const r of countRows.rows) {
    const n = parseInt(r.cnt, 10)
    const p = r.period === '24h' ? acc.last24h : acc.last7d
    p.total += n
    if (r.level === 'CRITICAL') p.critical += n
    else if (r.level === 'ERROR') p.error += n
    else if (r.level === 'WARN')  p.warn  += n
  }
  // last7d totals include last24h — make 7d mean "last 7 days inclusive"
  acc.last7d.total    += acc.last24h.total
  acc.last7d.critical += acc.last24h.critical
  acc.last7d.error    += acc.last24h.error
  acc.last7d.warn     += acc.last24h.warn

  const unackRow = await query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM error_events WHERE acknowledged = FALSE`
  )
  const unacknowledged = parseInt(unackRow.rows[0]?.cnt ?? '0', 10)

  return { ...acc, unacknowledged }
}

// ─── Recent errors for the dashboard table ───────────────────────────────────
export async function getRecentErrors(limit = 50): Promise<ErrorEvent[]> {
  const result = await query<ErrorEvent>(
    `SELECT id, level, category, message, stack, context, acknowledged, created_at
     FROM   error_events
     ORDER  BY created_at DESC
     LIMIT  $1`,
    [limit],
  )
  return result.rows
}

// ─── Acknowledge a single error ──────────────────────────────────────────────
export async function acknowledgeError(id: string): Promise<boolean> {
  const result = await query(
    `UPDATE error_events SET acknowledged = TRUE WHERE id = $1`,
    [id],
  )
  return (result.rowCount ?? 0) > 0
}
