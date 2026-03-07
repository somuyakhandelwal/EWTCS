// Usage Metrics Queries
// US-18.7: Ensure Active System Usage — track adoption metrics from audit_logs

import 'server-only'
import { query } from '@/shared/lib/db'

export interface UsageMetrics {
  // Last 30 days
  loginsLast30Days: number
  stageUpdatesLast30Days: number
  reportsViewedLast30Days: number
  activeUsersLast30Days: number
  // Daily trend (last 14 days)
  dailyLogins: DailyUsage[]
  // Per-user summary (top 10)
  topUsers: UserUsage[]
}

export interface DailyUsage {
  date: string       // YYYY-MM-DD
  logins: number
  stageUpdates: number
}

export interface UserUsage {
  userId: string
  username: string
  role: string
  logins: number
  stageUpdates: number
  lastActive: string | null
}

export async function getUsageMetrics(): Promise<UsageMetrics> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const [loginsRes, stageRes, reportsRes, activeUsersRes, trendRes, topUsersRes] =
    await Promise.all([
      // Total logins in last 30 days
      query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt
         FROM audit_logs
         WHERE entity_type = 'session'
           AND action_type = 'CREATE'
           AND created_at >= $1`,
        [thirtyDaysAgo]
      ),

      // Total stage updates in last 30 days
      query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt
         FROM audit_logs
         WHERE entity_type = 'bed_stage'
           AND action_type = 'UPDATE'
           AND created_at >= $1`,
        [thirtyDaysAgo]
      ),

      // Total report views/sign-offs in last 30 days
      query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt
         FROM audit_logs
         WHERE (entity_type = 'report' OR entity_type = 'report_sign_off')
           AND created_at >= $1`,
        [thirtyDaysAgo]
      ),

      // Distinct active users in last 30 days
      query<{ cnt: string }>(
        `SELECT COUNT(DISTINCT performed_by_user_id) AS cnt
         FROM audit_logs
         WHERE created_at >= $1
           AND performed_by_user_id IS NOT NULL`,
        [thirtyDaysAgo]
      ),

      // Daily login + update trend for last 14 days
      query<{ date: string; logins: string; stage_updates: string }>(
        `SELECT
           DATE(created_at AT TIME ZONE 'UTC')::text AS date,
           COUNT(*) FILTER (WHERE entity_type = 'session' AND action_type = 'CREATE') AS logins,
           COUNT(*) FILTER (WHERE entity_type = 'bed_stage' AND action_type = 'UPDATE')  AS stage_updates
         FROM audit_logs
         WHERE created_at >= $1
         GROUP BY DATE(created_at AT TIME ZONE 'UTC')
         ORDER BY date`,
        [fourteenDaysAgo]
      ),

      // Top 10 users by activity
      query<{
        user_id: string
        username: string
        role: string
        logins: string
        stage_updates: string
        last_active: string | null
      }>(
        `SELECT
           u.id                                                               AS user_id,
           u.username,
           u.role,
           COUNT(*) FILTER (WHERE a.entity_type = 'session' AND a.action_type = 'CREATE') AS logins,
           COUNT(*) FILTER (WHERE a.entity_type = 'bed_stage' AND a.action_type = 'UPDATE')  AS stage_updates,
           MAX(a.created_at)::text                                           AS last_active
         FROM users u
         LEFT JOIN audit_logs a ON a.performed_by_user_id = u.id
           AND a.created_at >= $1
         GROUP BY u.id, u.username, u.role
         ORDER BY (logins + stage_updates) DESC
         LIMIT 10`,
        [thirtyDaysAgo]
      ),
    ])

  return {
    loginsLast30Days: parseInt(loginsRes.rows[0]?.cnt ?? '0', 10),
    stageUpdatesLast30Days: parseInt(stageRes.rows[0]?.cnt ?? '0', 10),
    reportsViewedLast30Days: parseInt(reportsRes.rows[0]?.cnt ?? '0', 10),
    activeUsersLast30Days: parseInt(activeUsersRes.rows[0]?.cnt ?? '0', 10),
    dailyLogins: trendRes.rows.map((r) => ({
      date: r.date,
      logins: parseInt(r.logins, 10),
      stageUpdates: parseInt(r.stage_updates, 10),
    })),
    topUsers: topUsersRes.rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      role: r.role,
      logins: parseInt(r.logins, 10),
      stageUpdates: parseInt(r.stage_updates, 10),
      lastActive: r.last_active,
    })),
  }
}
