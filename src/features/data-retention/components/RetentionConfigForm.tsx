// RetentionConfigForm — admin form to set per-data-type retention periods
// EPIC 14 — US-14.2: Configurable Data Retention

'use client'

import { useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { updateRetentionConfig } from '../actions/retention-config-actions'
import type { RetentionConfig } from '../lib/data-retention-types'

interface RetentionConfigFormProps {
  initialConfig: RetentionConfig
}

interface FieldConfig {
  key: keyof Omit<RetentionConfig, 'requiresApproval'>
  label: string
  description: string
  min: number
  max: number
  unit: 'yr' | 'day'
}

const FIELDS: FieldConfig[] = [
  {
    key: 'patientAdmissionsYears',
    label: 'Patient Admissions',
    description: 'Discharge records in patient_admissions',
    min: 1,
    max: 99,
    unit: 'yr',
  },
  {
    key: 'auditLogsYears',
    label: 'Audit Logs',
    description: 'All system audit trail entries',
    min: 1,
    max: 99,
    unit: 'yr',
  },
  {
    key: 'bedStageLogDays',
    label: 'Bed Stage Logs',
    description: 'Bed stage transition history retention window',
    min: 1,
    max: 3650,
    unit: 'day',
  },
]

const inputClass = cn(
  'w-20 bg-muted border border-border rounded px-2 py-1',
  'text-sm text-card-foreground text-right',
  'focus:outline-none focus:ring-1 focus:ring-blue-500',
  'disabled:opacity-50 disabled:cursor-not-allowed',
)

export function RetentionConfigForm({ initialConfig }: RetentionConfigFormProps) {
  const [config, setConfig] = useState<RetentionConfig>(initialConfig)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleYearChange(key: keyof RetentionConfig, raw: string) {
    const val = parseInt(raw, 10)
    setConfig((prev) => ({ ...prev, [key]: isNaN(val) ? 0 : val }))
  }

  function handleApprovalToggle() {
    setConfig((prev) => ({ ...prev, requiresApproval: !prev.requiresApproval }))
  }

  function handleSubmit() {
    setFeedback(null)
    startTransition(async () => {
      const result = await updateRetentionConfig(config)
      setFeedback(
        result.success
          ? { ok: true, message: 'Retention settings saved.' }
          : { ok: false, message: result.error ?? 'Save failed.' },
      )
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {FIELDS.map(({ key, label, description, min, max, unit }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-card-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min={min}
                max={max}
                value={config[key] as number}
                onChange={(e) => handleYearChange(key, e.target.value)}
                disabled={isPending}
                aria-label={`${label} retention ${unit === 'yr' ? 'years' : 'days'}`}
                className={inputClass}
              />
              <span className="text-xs text-muted-foreground w-8">{unit === 'yr' ? 'yr' : 'day'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Approval toggle ── */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.requiresApproval}
          onChange={handleApprovalToggle}
          disabled={isPending}
          className="w-4 h-4 accent-blue-500"
        />
        <div>
          <p className="text-sm text-card-foreground">Require admin approval before deletion</p>
          <p className="text-xs text-muted-foreground">
            Cron runs create a pending job; an admin must approve before data is moved.
          </p>
        </div>
      </label>

      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-foreground"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {isPending ? 'Saving…' : 'Save Settings'}
        </Button>

        {feedback && (
          <p className={cn('text-xs', feedback.ok ? 'text-green-400' : 'text-red-400')}>
            {feedback.message}
          </p>
        )}
      </div>
    </div>
  )
}
