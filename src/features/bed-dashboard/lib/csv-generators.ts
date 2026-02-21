// CSV Generation Utilities
// Purpose: Generate CSV content from analytics data
// Epic: EPIC 3 - Time Tracking & Stage Logging

/**
 * Generate CSV content from transition data
 */
export function generateTransitionCSV(
  transitions: Array<{
    id: string
    bedNumber: string
    fromStageName: string | null
    toStageName: string
    transitionTime: Date | string
    durationInPreviousStageMs: number | null
    durationInCurrentStageMs: number | null
    changedByUserId: string
    changedByUsername: string
    notes: string | null
  }>
): string {
  const headers = [
    'ID',
    'Bed Number',
    'From Stage',
    'To Stage',
    'Transition Time',
    'Duration in Previous Stage (ms)',
    'Duration in Current Stage (ms)',
    'Changed By User ID',
    'Changed By',
    'Notes',
  ]

  const rows = transitions.map((t) => [
    t.id,
    t.bedNumber,
    t.fromStageName || 'N/A',
    t.toStageName,
    t.transitionTime instanceof Date ? t.transitionTime.toISOString() : t.transitionTime,
    t.durationInPreviousStageMs?.toString() || 'N/A',
    t.durationInCurrentStageMs?.toString() || 'N/A',
    t.changedByUserId,
    t.changedByUsername,
    `"${t.notes || ''}"`,
  ])

  const csvRows = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(','))
  return csvRows.join('\n')
}

export function generateAuditorHistoryCSV(
  rows: Array<{
    id: string
    bedNumber: string
    fromStageName: string | null
    toStageName: string
    transitionTime: Date | string
    changedByUserId: string
    changedByUsername: string
    durationInPreviousStageMs: number | null
    notes: string | null
  }>
): string {
  const headers = [
    'ID',
    'Bed Number',
    'From Stage',
    'To Stage',
    'Transition Time',
    'Changed By User ID',
    'Changed By Username',
    'Duration in Previous Stage (ms)',
    'Notes',
  ]

  const csvRows = rows.map((row) => [
    row.id,
    row.bedNumber,
    row.fromStageName ?? 'N/A',
    row.toStageName,
    row.transitionTime instanceof Date ? row.transitionTime.toISOString() : row.transitionTime,
    row.changedByUserId,
    row.changedByUsername,
    row.durationInPreviousStageMs?.toString() ?? 'N/A',
    row.notes ?? '',
  ])

  return [headers, ...csvRows]
    .map((line) => line.map((cell) => `"${cell}"`).join(','))
    .join('\n')
}
