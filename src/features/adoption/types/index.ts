// Types for the adoption / usage-monitoring feature (US-18.7)

/** KPI counters shown on the usage dashboard */
export interface UsageMetrics {
    loginsToday: number
    loginsThisWeek: number
    loginsThisMonth: number
    bedUpdatesToday: number
    bedUpdatesThisWeek: number
    bedUpdatesThisMonth: number
    reportsGeneratedThisMonth: number
    activeUsersThisMonth: number
    totalUsers: number
}

/** One data-point in the 30-day login trend chart */
export interface LoginTrendPoint {
    date: string   // ISO date string  e.g. "2026-02-28"
    logins: number
}

/** One row in the monthly breakdown table */
export interface MonthlyUsageSummary {
    month: string         // e.g. "2026-02"
    totalLogins: number
    uniqueUsers: number
    bedUpdates: number
    reportsGenerated: number
}

/** A user who has not logged in recently — candidate for follow-up training */
export interface LowUsageUser {
    userId: string
    username: string
    role: string
    lastLogin: string | null   // ISO timestamp or null if never logged in
    daysSinceLogin: number | null
}

/** A single user feedback record */
export interface UserFeedback {
    id: string
    userId: string
    username?: string
    category: FeedbackCategory
    rating: number | null
    message: string | null
    createdAt: string  // ISO timestamp
}

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'training' | 'usability'
