/**
 * TypeScript types for security scanning feature
 * EPIC 17: Security & Privacy
 * Represents vulnerability scan results, SLA tracking, and report data
 */

/**
 * Vulnerability severity levels
 */
export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

/**
 * Single vulnerability from npm audit
 */
export interface Vulnerability {
  id: string
  packageName: string
  severity: VulnerabilitySeverity
  title: string
  description: string
  url: string
  fixAvailable: boolean
  fixedInVersion?: string
  range: string
  type: 'direct' | 'indirect'
}

/**
 * Summary of vulnerabilities by severity
 */
export interface VulnerabilitySummary {
  critical: number
  high: number
  medium: number
  low: number
  info: number
  total: number
}

/**
 * Complete security scan result
 */
export interface SecurityScan {
  id: string
  timestamp: Date
  scanDate: string // ISO date: YYYY-MM-DD
  vulnerabilities: Vulnerability[]
  summary: VulnerabilitySummary
  outdatedPackages: number
  fixableVulnerabilities: number
  vulnerabilityPercentage: number // % of packages with vulnerabilities
  scanTool: 'npm-audit' | 'dependabot' | 'snyk'
  status: 'success' | 'warning' | 'failure'
}

/**
 * SLA (Service Level Agreement) for vulnerability fixes
 */
export interface VulnerabilitySLA {
  vulnerabilityId: string
  severity: VulnerabilitySeverity
  foundDate: Date
  slaDeadline: Date
  fixedDate?: Date
  status: 'open' | 'in-progress' | 'fixed' | 'waived'
  waiverReason?: string
  isBreached: boolean
  daysOverdue?: number
}

/**
 * SLA tracking summary
 */
export interface SLATrackingSummary {
  totalVulnerabilities: number
  openCount: number
  breachedCount: number
  fixedCount: number
  waivedCount: number
  criticalBreached: number
  highBreached: number
}

/**
 * Scan report with formatting
 */
export interface ScanReport {
  scan: SecurityScan
  slaSummary: SLATrackingSummary
  breachedItems: VulnerabilitySLA[]
  markdown: string
  html: string
  json: string
}

/**
 * Notification payload for security team
 */
export interface SecurityNotification {
  type: 'scan-complete' | 'critical-found' | 'sla-breach' | 'high-found'
  severity: VulnerabilitySeverity
  summary: string
  scanId: string
  vulnerabilityCount: number
  actionRequired: boolean
  recipientEmail: string
}

/**
 * Scan history entry for archival
 */
export interface ScanHistoryEntry {
  id: string
  scanDate: string
  critical: number
  high: number
  medium: number
  low: number
  total: number
  fixableCount: number
  status: 'clean' | 'issues' | 'critical'
  archivedAt: Date
}
