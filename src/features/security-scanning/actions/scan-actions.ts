/**
 * Server actions for security scanning
 * Handles scan processing, SLA tracking, and notifications
 * EPIC 17: Security & Privacy
 */

'use server'

import { requireAdminWrite } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { parseNpmAuditReport } from '../lib/scan-parser'
import {
  createSLAEntries,
  calculateSLASummary,
  getBreachedItems,
  getEscalationLevel,
} from '../lib/sla-tracker'
import {
  generateMarkdownReport,
  generateHtmlReport,
  generateJsonReport,
} from '../lib/report-formatter'
import { parseAuditReportInputSchema } from '../schemas/scan-schemas'
import type { SecurityScan, ScanReport } from '../types/scan'

/**
 * Process npm audit report and generate full report with SLA tracking
 */
export async function processScanReport(
  input: { reportJson: string; scanDate?: string }
): Promise<{ success: boolean; report?: ScanReport; error?: string }> {
  try {
    // Validate input
    const parsed = parseAuditReportInputSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: 'Invalid input: ' + parsed.error.issues[0]?.message,
      }
    }

    const scan = parseNpmAuditReport(parsed.data.reportJson, parsed.data.scanDate)
    const slaEntries = createSLAEntries(scan)
    const slaSummary = calculateSLASummary(slaEntries)
    const breachedItems = getBreachedItems(slaEntries)

    // Generate formatted reports
    const markdown = generateMarkdownReport(scan, slaSummary, breachedItems)
    const html = generateHtmlReport(markdown)
    const json = generateJsonReport(scan, slaSummary)

    const report: ScanReport = {
      scan,
      slaSummary,
      breachedItems,
      markdown,
      html,
      json,
    }

    logger.info('Security scan report processed', {
      scanId: scan.id,
      vulnCount: scan.summary.total,
      breachedCount: slaSummary.breachedCount,
      escalationLevel: getEscalationLevel(slaEntries),
    })

    return { success: true, report }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to process scan'
    logger.error('Error processing scan report', error as Error)
    return { success: false, error: msg }
  }
}

/**
 * Archive scan result for historical tracking
 */
export async function archiveScanResult(
  scanId: string,
  scanData: SecurityScan
): Promise<{ success: boolean; error?: string }> {
  try {
    // Admin-only operation
    const session = await requireAdminWrite({
      actionType: 'CREATE',
      entityType: 'security_scan',
      entityId: scanId,
    })

    // TODO: Store in database (will add migration)
    // For now, log to audit trail
    await logAudit({
      actionType: 'ARCHIVE_SCAN',
      entityType: 'security_scan',
      entityId: scanId,
      performedBy: session.userId,
      changes: {
        scanDate: scanData.scanDate,
        vulnerabilities: scanData.summary.total,
        critical: scanData.summary.critical,
      },
    })

    logger.info('Scan result archived', {
      scanId,
      vulnCount: scanData.summary.total,
    })

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to archive scan'
    logger.error('Error archiving scan', error as Error)
    return { success: false, error: msg }
  }
}

/**
 * Fetch recent scans (last 30 days)
 */
export async function getRecentScans(
  limit: number = 30
): Promise<{ success: boolean; scans?: unknown[]; error?: string }> {
  try {
    // Allow admin, supervisor, and auditor
    const session = await requireAdminWrite()

    // TODO: Query from database (will add migration)
    // For now, return empty array
    logger.info('Fetching recent scans', {
      userId: session.userId,
      limit,
    })

    return { success: true, scans: [] }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch scans'
    logger.error('Error fetching scans', error as Error)
    return { success: false, error: msg }
  }
}

/**
 * Get scan by date
 */
export async function getScanByDate(
  scanDate: string
): Promise<{ success: boolean; scan?: SecurityScan; error?: string }> {
  try {
    const session = await requireAdminWrite()

    // TODO: Query from database
    logger.info('Fetching scan by date', {
      userId: session.userId,
      scanDate,
    })

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch scan'
    logger.error('Error fetching scan', error as Error)
    return { success: false, error: msg }
  }
}
