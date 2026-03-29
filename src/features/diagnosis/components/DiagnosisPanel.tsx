'use client'

import { useEffect, useState } from 'react'
import { getDiagnosisForBed } from '../actions/diagnosis-actions'
import type { DiagnosisRecord } from '../types/diagnosis.types'
import type { SeverityType } from '../schemas/diagnosis-schemas'

const SEVERITY_COLORS: Record<SeverityType, string> = {
  MILD: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  MODERATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  SEVERE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

/**
 * Props for the DiagnosisPanel component.
 */
interface DiagnosisPanelProps {
  /** The UUID of the bed to display the diagnosis for */
  bedId: string
}

/**
 * Read-only diagnosis panel shown to nurses in subsequent stages.
 * Fetches the latest diagnosis for this bed and renders it compactly.
 */
export function DiagnosisPanel({ bedId }: DiagnosisPanelProps) {
  const [diagnosis, setDiagnosis] = useState<DiagnosisRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getDiagnosisForBed(bedId).then((record) => {
      if (!cancelled) {
        setDiagnosis(record)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [bedId])

  if (loading || !diagnosis) return null

  const severity = diagnosis.severity as SeverityType | null
  const diagnosedAt = diagnosis.diagnosed_at
    ? new Date(diagnosis.diagnosed_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Diagnosis
        </p>
        {severity && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${SEVERITY_COLORS[severity]}`}>
            {severity}
          </span>
        )}
      </div>

      {diagnosis.diagnosis_text && (
        <p className="text-xs text-foreground font-medium leading-snug line-clamp-3">
          {diagnosis.diagnosis_text}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground">
        Dr. {diagnosis.doctor_username ?? 'Unknown'}
        {diagnosedAt ? ` · ${diagnosedAt}` : ''}
      </p>
    </div>
  )
}
