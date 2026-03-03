/**
 * Security scan report parser
 * Parses npm audit JSON output and generates reports
 * EPIC 17: Security & Privacy
 */

import { logger } from '@/shared/config/logger'
import { v4 as uuidv4 } from 'uuid'
import type { SecurityScan, Vulnerability, VulnerabilitySummary } from '../types/scan'

interface AuditVulnerability {
  name: string
  severity: string
  isDirect: boolean
  via: string[]
  range: string
  fixAvailable: boolean | { name: string; version: string }
}

interface AuditMetadata {
  vulnerabilities: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
    total: number
  }
}

interface AuditReport {
  vulnerabilities: Record<string, AuditVulnerability>
  metadata: AuditMetadata
}

/**
 * Parse npm audit JSON output
 */
export function parseNpmAuditReport(reportJson: string, scanDate?: string): SecurityScan {
  try {
    const audit = JSON.parse(reportJson) as AuditReport
    const metadata = audit.metadata
    const vulns: Vulnerability[] = []

    // Extract vulnerabilities
    Object.entries(audit.vulnerabilities || {}).forEach(([pkgName, vuln]) => {
      const fixAvailable = typeof vuln.fixAvailable === 'object'
      const fixedInVersion = typeof vuln.fixAvailable === 'object'
        ? vuln.fixAvailable.version
        : undefined

      vulns.push({
        id: `${pkgName}-${vuln.severity}-${Date.now()}`,
        packageName: pkgName,
        severity: (vuln.severity as 'critical' | 'high' | 'medium' | 'low' | 'info') || 'low',
        title: `${pkgName}: ${vuln.severity} severity vulnerability`,
        description: `Vulnerability in ${pkgName}. Range: ${vuln.range}`,
        url: `https://www.npmjs.com/package/${pkgName}`,
        fixAvailable,
        fixedInVersion,
        range: vuln.range,
        type: vuln.isDirect ? 'direct' : 'indirect',
      })
    })

    const summary: VulnerabilitySummary = {
      critical: metadata.vulnerabilities.critical || 0,
      high: metadata.vulnerabilities.high || 0,
      medium: metadata.vulnerabilities.medium || 0,
      low: metadata.vulnerabilities.low || 0,
      info: metadata.vulnerabilities.info || 0,
      total: metadata.vulnerabilities.total || 0,
    }

    const now = new Date()
    const dateStr = scanDate || now.toISOString().split('T')[0]
    const fixable = vulns.filter(v => v.fixAvailable).length

    const scan: SecurityScan = {
      id: uuidv4(),
      timestamp: now,
      scanDate: dateStr,
      vulnerabilities: vulns,
      summary,
      outdatedPackages: 0, // Will be calculated separately
      fixableVulnerabilities: fixable,
      vulnerabilityPercentage: (summary.total / (283 + fixable)) * 100, // Approximate
      scanTool: 'npm-audit',
      status: summary.critical > 0 ? 'failure' : summary.high > 0 ? 'warning' : 'success',
    }

    logger.info('Parsed npm audit report', {
      scanId: scan.id,
      total: summary.total,
      critical: summary.critical,
      fixable,
    })

    return scan
  } catch (error) {
    logger.error('Failed to parse audit report', error as Error)
    throw new Error('Invalid audit report JSON')
  }
}

/**
 * Calculate SLA deadline based on severity
 */
export function calculateSLADeadline(
  foundDate: Date,
  severity: string
): Date {
  const hoursMap: Record<string, number> = {
    critical: 48,
    high: 168, // 7 days
    medium: 720, // 30 days
    low: 2160, // 90 days
  }

  const hours = hoursMap[severity] || 2160
  const deadline = new Date(foundDate)
  deadline.setHours(deadline.getHours() + hours)

  return deadline
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(deadline: Date): boolean {
  return new Date() > deadline
}

/**
 * Calculate days overdue
 */
export function calculateDaysOverdue(deadline: Date, fixedDate?: Date): number {
  const checkDate = fixedDate || new Date()
  const diff = checkDate.getTime() - deadline.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
