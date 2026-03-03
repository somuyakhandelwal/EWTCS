/**
 * SLA tracking and management
 * Monitors vulnerability fix deadlines and escalations
 * EPIC 17: Security & Privacy
 */

import type { SecurityScan, VulnerabilitySLA, SLATrackingSummary } from '../types/scan'
import {
  calculateSLADeadline,
  isSLABreached,
  calculateDaysOverdue,
} from './scan-parser'
import { logger } from '@/shared/config/logger'

/**
 * Default SLA hours by severity
 */
export const DEFAULT_SLA_HOURS = {
  critical: 48,
  high: 168, // 7 days
  medium: 720, // 30 days
  low: 2160, // 90 days
} as const

/**
 * Create SLA entries from scan
 */
export function createSLAEntries(scan: SecurityScan): VulnerabilitySLA[] {
  return scan.vulnerabilities.map(vuln => {
    const foundDate = scan.timestamp
    const slaDeadline = calculateSLADeadline(foundDate, vuln.severity)
    const isBreached = isSLABreached(slaDeadline)

    return {
      vulnerabilityId: vuln.id,
      severity: vuln.severity,
      foundDate,
      slaDeadline,
      status: 'open',
      isBreached,
      daysOverdue: isBreached ? calculateDaysOverdue(slaDeadline) : undefined,
    }
  })
}

/**
 * Calculate SLA summary
 */
export function calculateSLASummary(slaEntries: VulnerabilitySLA[]): SLATrackingSummary {
  const summary: SLATrackingSummary = {
    totalVulnerabilities: slaEntries.length,
    openCount: 0,
    breachedCount: 0,
    fixedCount: 0,
    waivedCount: 0,
    criticalBreached: 0,
    highBreached: 0,
  }

  slaEntries.forEach(entry => {
    if (entry.status === 'fixed') {
      summary.fixedCount++
    } else if (entry.status === 'waived') {
      summary.waivedCount++
    } else {
      summary.openCount++

      if (entry.isBreached) {
        summary.breachedCount++
        if (entry.severity === 'critical') summary.criticalBreached++
        if (entry.severity === 'high') summary.highBreached++
      }
    }
  })

  return summary
}

/**
 * Get breached SLA items
 */
export function getBreachedItems(slaEntries: VulnerabilitySLA[]): VulnerabilitySLA[] {
  return slaEntries.filter(entry => entry.isBreached && entry.status === 'open')
}

/**
 * Check if critical SLA breached
 */
export function isCriticalSLABreached(slaEntries: VulnerabilitySLA[]): boolean {
  return slaEntries.some(
    entry => entry.severity === 'critical' && entry.isBreached && entry.status === 'open'
  )
}

/**
 * Format SLA deadline for display
 */
export function formatSLADeadline(deadline: Date): string {
  const diff = deadline.getTime() - new Date().getTime()
  if (diff < 0) {
    const days = Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24))
    return `OVERDUE by ${days} day${days > 1 ? 's' : ''}`
  }
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return `${days} day${days > 1 ? 's' : ''} remaining`
}

/**
 * Get escalation level
 */
export function getEscalationLevel(slaEntries: VulnerabilitySLA[]): 'none' | 'warning' | 'critical' {
  const breachedCritical = slaEntries.filter(
    e => e.severity === 'critical' && e.isBreached
  ).length

  const breachedHigh = slaEntries.filter(
    e => e.severity === 'high' && e.isBreached
  ).length

  if (breachedCritical > 0) return 'critical'
  if (breachedHigh > 2) return 'warning'
  return 'none'
}

/**
 * Log SLA breach for audit trail
 */
export function logSLABreach(entry: VulnerabilitySLA): void {
  logger.warn('SLA BREACH DETECTED', {
    vulnerabilityId: entry.vulnerabilityId,
    severity: entry.severity,
    foundDate: entry.foundDate,
    deadline: entry.slaDeadline,
    daysOverdue: entry.daysOverdue,
    status: entry.status,
  })
}
