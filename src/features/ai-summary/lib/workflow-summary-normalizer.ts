import type { AiInsight } from '../types/daily-summary'

const WORKFLOW_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\btriage as an ER stage\b/gi, 'triage as a separate care area'],
  [/\bpart of the ER stage list\b/gi, 'part of the separate triage workflow'],
  [/\bwithin the ER stage list\b/gi, 'within the separate triage workflow'],
  [/\bemergency ward triage\b/gi, 'triage area'],
  [/\bER triage\b/gi, 'triage area'],
  [/\btriage stages\b/gi, 'triage workflow states'],
  [/\btriage stage\b/gi, 'triage area'],
]

export function normalizeWorkflowSummaryText(text?: string): string | undefined {
  if (!text) {
    return text
  }

  return WORKFLOW_REPLACEMENTS.reduce(
    (normalized, [pattern, replacement]) => normalized.replace(pattern, replacement),
    text
  )
}

export function normalizeWorkflowInsights(insights: AiInsight[]): AiInsight[] {
  return insights.map((insight) => ({
    ...insight,
    text: normalizeWorkflowSummaryText(insight.text) ?? insight.text,
  }))
}
