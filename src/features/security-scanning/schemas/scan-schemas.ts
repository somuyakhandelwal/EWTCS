/**
 * Zod validation schemas for security scanning
 * EPIC 17: Security & Privacy
 */

import { z } from 'zod'

/**
 * Schema for single vulnerability from npm audit JSON
 */
export const vulnerabilitySchema = z.object({
  id: z.string().describe('Unique vulnerability ID'),
  packageName: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info'] as const),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  fixAvailable: z.boolean().default(false),
  fixedInVersion: z.string().optional(),
  range: z.string(),
  type: z.enum(['direct', 'indirect'] as const).default('indirect'),
})

/**
 * Schema for vulnerability summary
 */
export const vulnerabilitySummarySchema = z.object({
  critical: z.number().nonnegative(),
  high: z.number().nonnegative(),
  medium: z.number().nonnegative(),
  low: z.number().nonnegative(),
  info: z.number().nonnegative(),
  total: z.number().nonnegative(),
})

/**
 * Schema for security scan result
 */
export const securityScanSchema = z.object({
  id: z.string().uuid().describe('Unique scan ID'),
  timestamp: z.date(),
  scanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD format'),
  vulnerabilities: z.array(vulnerabilitySchema),
  summary: vulnerabilitySummarySchema,
  outdatedPackages: z.number().nonnegative(),
  fixableVulnerabilities: z.number().nonnegative(),
  vulnerabilityPercentage: z.number().min(0).max(100),
  scanTool: z.enum(['npm-audit', 'dependabot', 'snyk'] as const),
  status: z.enum(['success', 'warning', 'failure'] as const),
})

/**
 * Schema for SLA entry
 */
export const vulnerabilitySLASchema = z.object({
  vulnerabilityId: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info'] as const),
  foundDate: z.date(),
  slaDeadline: z.date(),
  fixedDate: z.date().optional(),
  status: z.enum(['open', 'in-progress', 'fixed', 'waived'] as const),
  waiverReason: z.string().optional(),
  isBreached: z.boolean(),
  daysOverdue: z.number().optional(),
})

/**
 * Schema for SLA tracking summary
 */
export const slaTrackingSummarySchema = z.object({
  totalVulnerabilities: z.number().nonnegative(),
  openCount: z.number().nonnegative(),
  breachedCount: z.number().nonnegative(),
  fixedCount: z.number().nonnegative(),
  waivedCount: z.number().nonnegative(),
  criticalBreached: z.number().nonnegative(),
  highBreached: z.number().nonnegative(),
})

/**
 * Schema for scan report
 */
export const scanReportSchema = z.object({
  scan: securityScanSchema,
  slaSummary: slaTrackingSummarySchema,
  breachedItems: z.array(vulnerabilitySLASchema),
  markdown: z.string().describe('Formatted markdown report'),
  html: z.string().describe('Formatted HTML report'),
  json: z.string().describe('JSON-formatted report'),
})

/**
 * Schema for scan history entry
 */
export const scanHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  scanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  critical: z.number().nonnegative(),
  high: z.number().nonnegative(),
  medium: z.number().nonnegative(),
  low: z.number().nonnegative(),
  total: z.number().nonnegative(),
  fixableCount: z.number().nonnegative(),
  status: z.enum(['clean', 'issues', 'critical'] as const),
  archivedAt: z.date(),
})

/**
 * Schema for API input (parsing audit report)
 */
export const parseAuditReportInputSchema = z.object({
  reportJson: z.string().describe('Raw JSON from npm audit'),
  scanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

/**
 * Schema for SLA configuration
 */
export const slaConfigSchema = z.object({
  critical: z.number().positive().describe('Hours to fix critical'),
  high: z.number().positive().describe('Hours to fix high'),
  medium: z.number().positive().describe('Hours to fix medium'),
  low: z.number().positive().describe('Hours to fix low'),
})

export type Vulnerability = z.infer<typeof vulnerabilitySchema>
export type VulnerabilitySummary = z.infer<typeof vulnerabilitySummarySchema>
export type SecurityScan = z.infer<typeof securityScanSchema>
export type VulnerabilitySLA = z.infer<typeof vulnerabilitySLASchema>
export type SLATrackingSummary = z.infer<typeof slaTrackingSummarySchema>
export type ScanReport = z.infer<typeof scanReportSchema>
export type ScanHistoryEntry = z.infer<typeof scanHistoryEntrySchema>
export type ParseAuditReportInput = z.infer<typeof parseAuditReportInputSchema>
export type SLAConfig = z.infer<typeof slaConfigSchema>
