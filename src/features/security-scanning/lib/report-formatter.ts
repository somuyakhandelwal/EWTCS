/**
 * Security scan report formatter
 * Generates human-readable markdown and HTML reports
 * EPIC 17: Security & Privacy
 */

import type { SecurityScan, VulnerabilitySLA, SLATrackingSummary } from '../types/scan'

/**
 * Generate markdown report
 */
export function generateMarkdownReport(
  scan: SecurityScan,
  slaSummary: SLATrackingSummary,
  breachedItems: VulnerabilitySLA[]
): string {
  const date = new Date(scan.timestamp).toLocaleString('en-IN')
  const status = scan.status === 'success' ? '✅ PASS' : scan.status === 'warning' ? '⚠️ WARNING' : '❌ FAIL'

  let md = `# Security Scan Report

**Scan Date:** ${scan.scanDate}
**Report Generated:** ${date}
**Status:** ${status}

## Summary

| Metric | Count |
|--------|-------|
| Critical | ${scan.summary.critical} |
| High | ${scan.summary.high} |
| Medium | ${scan.summary.medium} |
| Low | ${scan.summary.low} |
| **Total** | **${scan.summary.total}** |
| Fixable | ${scan.fixableVulnerabilities} |

## SLA Status

| Status | Count |
|--------|-------|
| Open | ${slaSummary.openCount} |
| In Progress | ${slaSummary.fixedCount - slaSummary.breachedCount} |
| **Breached** | **${slaSummary.breachedCount}** |
| Fixed | ${slaSummary.fixedCount} |
| Waived | ${slaSummary.waivedCount} |

## Breached SLAs

`

  if (breachedItems.length === 0) {
    md += '\n✅ No SLA breaches detected.\n'
  } else {
    md += '\n❌ **The following items have breached their SLA:**\n\n'
    breachedItems.forEach(item => {
      md += `- **${item.severity.toUpperCase()}** - ${item.vulnerabilityId}\n`
      md += `  - Found: ${item.foundDate.toLocaleDateString()}\n`
      md += `  - Deadline: ${item.slaDeadline.toLocaleDateString()}\n`
      md += `  - Overdue: ${item.daysOverdue || 0} days\n`
    })
  }

  md += `

## Critical Vulnerabilities

${scan.summary.critical === 0
    ? '✅ No critical vulnerabilities detected.'
    : scan.vulnerabilities
        .filter(v => v.severity === 'critical')
        .map(v => `- **${v.packageName}** (${v.fixAvailable ? 'fixable' : 'manual fix required'})\n  ${v.title}`)
        .join('\n')
  }

## Recommendations

${scan.fixableVulnerabilities > 0
    ? `1. **Fix ${scan.fixableVulnerabilities} vulnerabilities**: Run \`npm audit fix\``
    : '1. All vulnerabilities require manual review.'
  }
2. Review unfixable vulnerabilities for workarounds
3. Update monitoring and alert thresholds if needed
4. Plan upgrades for dependencies with pending improvements

---

*Report generated automatically by EWTCS Security Scanning System*
`

  return md
}

/**
 * Generate HTML report
 */
export function generateHtmlReport(markdown: string): string {
  // Simple markdown to HTML conversion
  const html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Security Scan Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 0.5rem; }
    h2 { color: #374151; margin-top: 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    td { border: 1px solid #e5e7eb; padding: 0.5rem; }
    .pass { color: #16a34a; }
    .fail { color: #dc2626; }
    .warning { color: #f59e0b; }
    ul { margin: 1rem 0; }
    p { line-height: 1.6; }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`
}

/**
 * Convert report to JSON string
 */
export function generateJsonReport(scan: SecurityScan, slaSummary: SLATrackingSummary): string {
  return JSON.stringify(
    {
      scan,
      slaSummary,
      generatedAt: new Date().toISOString(),
    },
    null,
    2
  )
}
