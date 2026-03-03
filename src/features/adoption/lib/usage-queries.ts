import { query } from '@/shared/lib/db'
import type {
    UsageMetrics,
    LoginTrendPoint,
    MonthlyUsageSummary,
    LowUsageUser,
} from '@/features/adoption/types'

// ---------------------------------------------------------------------------
// Usage Metrics (derived entirely from existing audit_logs)
// ---------------------------------------------------------------------------

export async function fetchUsageMetrics(): Promise<UsageMetrics> {
    const result = await query<{
        logins_today: string
        logins_week: string
        logins_month: string
        bed_updates_today: string
        bed_updates_week: string
        bed_updates_month: string
        reports_month: string
        active_users_month: string
    }>(`
        SELECT
            -- Logins: count LOGIN events; fall back to LOGOUT as a reliable proxy
            -- (LOGIN audit events may not always land due to Next.js server-action
            -- redirect interplay, whereas LOGOUT comes from an API route handler
            -- which is fully reliable).
            COUNT(*) FILTER (WHERE action_type IN ('LOGIN','LOGOUT') AND entity_type = 'user' AND created_at >= CURRENT_DATE)                AS logins_today,
            COUNT(*) FILTER (WHERE action_type IN ('LOGIN','LOGOUT') AND entity_type = 'user' AND created_at >= date_trunc('week',  NOW())) AS logins_week,
            COUNT(*) FILTER (WHERE action_type IN ('LOGIN','LOGOUT') AND entity_type = 'user' AND created_at >= date_trunc('month', NOW())) AS logins_month,
            -- Bed updates (entity_type covers UPDATE/DISCHARGE/UNDO/SUPERVISOR_OVERRIDE on beds & stage_transitions)
            COUNT(*) FILTER (WHERE entity_type IN ('bed', 'stage_transition') AND created_at >= CURRENT_DATE)     AS bed_updates_today,
            COUNT(*) FILTER (WHERE entity_type IN ('bed', 'stage_transition') AND created_at >= date_trunc('week',  NOW())) AS bed_updates_week,
            COUNT(*) FILTER (WHERE entity_type IN ('bed', 'stage_transition') AND created_at >= date_trunc('month', NOW())) AS bed_updates_month,
            -- AI reports generated this month (count GENERATED only — avoids double-counting with APPROVED)
            COUNT(*) FILTER (WHERE action_type = 'DAILY_SUMMARY_GENERATED' AND created_at >= date_trunc('month', NOW())) AS reports_month,
            -- Distinct active users this month (any action = active)
            COUNT(DISTINCT performed_by_user_id) FILTER (WHERE created_at >= date_trunc('month', NOW()))                                AS active_users_month
        FROM audit_logs
    `)

    const row = result.rows[0]

    // Fetch total user count separately
    const usersResult = await query<{ total: string }>(`SELECT COUNT(*) AS total FROM users WHERE is_active = true`)
    const totalUsers = parseInt(usersResult.rows[0]?.total ?? '0', 10)

    return {
        loginsToday: parseInt(row.logins_today, 10),
        loginsThisWeek: parseInt(row.logins_week, 10),
        loginsThisMonth: parseInt(row.logins_month, 10),
        bedUpdatesToday: parseInt(row.bed_updates_today, 10),
        bedUpdatesThisWeek: parseInt(row.bed_updates_week, 10),
        bedUpdatesThisMonth: parseInt(row.bed_updates_month, 10),
        reportsGeneratedThisMonth: parseInt(row.reports_month, 10),
        activeUsersThisMonth: parseInt(row.active_users_month, 10),
        totalUsers,
    }
}

// ---------------------------------------------------------------------------
// 30-day daily login trend
// ---------------------------------------------------------------------------

export async function fetchLoginTrend(): Promise<LoginTrendPoint[]> {
    // Use generate_series to guarantee a row for every one of the last 30 days,
    // filling gaps (days with no logins) with 0.
    const result = await query<{ day: string; logins: string }>(`
        SELECT
            TO_CHAR(g.day, 'YYYY-MM-DD') AS day,
            COUNT(al.id)                 AS logins
        FROM generate_series(
            DATE_TRUNC('day', NOW() - INTERVAL '29 days'),
            DATE_TRUNC('day', NOW()),
            INTERVAL '1 day'
        ) AS g(day)
        LEFT JOIN audit_logs al
               ON DATE_TRUNC('day', al.created_at) = g.day
              AND al.action_type IN ('LOGIN', 'LOGOUT')
              AND al.entity_type = 'user'
        GROUP BY g.day
        ORDER BY g.day ASC
    `)

    return result.rows.map((row) => ({
        date: row.day,
        logins: parseInt(row.logins, 10),
    }))
}

// ---------------------------------------------------------------------------
// Monthly usage summary (last 6 months)
// ---------------------------------------------------------------------------

export async function fetchMonthlyUsageSummary(): Promise<MonthlyUsageSummary[]> {
    const result = await query<{
        month: string
        total_logins: string
        unique_users: string
        bed_updates: string
        reports: string
    }>(`
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
            COUNT(*) FILTER (WHERE action_type IN ('LOGIN','LOGOUT') AND entity_type = 'user')                   AS total_logins,
            COUNT(DISTINCT performed_by_user_id) FILTER (WHERE action_type IN ('LOGIN','LOGOUT') AND entity_type = 'user') AS unique_users,
            COUNT(*) FILTER (WHERE entity_type IN ('bed', 'stage_transition'))                                    AS bed_updates,
            COUNT(*) FILTER (WHERE action_type = 'DAILY_SUMMARY_GENERATED')                                      AS reports
        FROM audit_logs
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY month
        ORDER BY month ASC
    `)

    return result.rows.map((row) => ({
        month: row.month,
        totalLogins: parseInt(row.total_logins, 10),
        uniqueUsers: parseInt(row.unique_users, 10),
        bedUpdates: parseInt(row.bed_updates, 10),
        reportsGenerated: parseInt(row.reports, 10),
    }))
}

// ---------------------------------------------------------------------------
// Low-usage users — no login in the past N days (default 7)
// ---------------------------------------------------------------------------

const LOW_USAGE_THRESHOLD_DAYS = 7

export async function fetchLowUsageUsers(
    thresholdDays: number = LOW_USAGE_THRESHOLD_DAYS
): Promise<LowUsageUser[]> {
    const result = await query<{
        user_id: string
        username: string
        role: string
        last_login: string | null
        days_since_login: string | null
    }>(`
        SELECT
            u.id                                            AS user_id,
            u.username,
            u.role,
            MAX(al.created_at)                             AS last_login,
            EXTRACT(DAY FROM NOW() - MAX(al.created_at))  AS days_since_login
        FROM users u
        LEFT JOIN audit_logs al ON al.performed_by_user_id = u.id
                               AND al.action_type IN ('LOGIN', 'LOGOUT')
                               AND al.entity_type = 'user'
        WHERE u.is_active = true
        GROUP BY u.id, u.username, u.role
        HAVING MAX(al.created_at) IS NULL
            OR MAX(al.created_at) < NOW() - ($1::integer * INTERVAL '1 day')
        ORDER BY last_login ASC NULLS FIRST
    `, [thresholdDays])

    return result.rows.map((row) => ({
        userId: row.user_id,
        username: row.username,
        role: row.role,
        lastLogin: row.last_login ?? null,
        daysSinceLogin: row.days_since_login != null ? Math.floor(parseFloat(row.days_since_login)) : null,
    }))
}
