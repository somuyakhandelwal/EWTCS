'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  getMyAlertPreferences,
  resetMyAlertPreferences,
  updateMyAlertPreferences,
} from '@/features/notifications/actions/alert-preferences-actions'
import type { AlertPreferences } from '@/features/notifications/types/alert-preferences'

interface AlertPreferencesPanelProps {
  onPreferencesChange?: (preferences: AlertPreferences) => void
}

const alertTypeFields = [
  { key: 'delayedBeds', label: 'Delayed bed alerts' },
  { key: 'escalations', label: 'Escalation alerts' },
  { key: 'dispositionBottlenecks', label: 'Disposition bottleneck alerts' },
  { key: 'systemErrors', label: 'System error alerts' },
] as const

const thresholdFields = [
  { key: 'delayMinutes', label: 'Delay threshold (minutes)', min: 30, max: 720 },
  { key: 'escalationMinutes', label: 'Escalation threshold (minutes)', min: 60, max: 1440 },
  { key: 'bottleneckCount', label: 'Bottleneck trigger count', min: 1, max: 50 },
] as const

export function AlertPreferencesPanel({ onPreferencesChange }: AlertPreferencesPanelProps) {
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPreferences() {
      setLoading(true)
      const result = await getMyAlertPreferences()
      if (!result.success || !result.data) {
        setError(result.error ?? 'Failed to load preferences')
        setLoading(false)
        return
      }

      setPreferences(result.data)
      onPreferencesChange?.(result.data)
      setLoading(false)
    }

    void loadPreferences()
  }, [onPreferencesChange])

  function updateLocal(next: AlertPreferences) {
    setPreferences(next)
    setMessage('')
    setError('')
  }

  function updateAlertType(
    key: keyof AlertPreferences['enabledAlertTypes'],
    value: boolean
  ) {
    if (!preferences) return
    updateLocal({
      ...preferences,
      enabledAlertTypes: { ...preferences.enabledAlertTypes, [key]: value },
    })
  }

  function updateThreshold(
    key: keyof AlertPreferences['thresholds'],
    value: number
  ) {
    if (!preferences) return
    updateLocal({
      ...preferences,
      thresholds: { ...preferences.thresholds, [key]: value },
    })
  }

  async function handleSave() {
    if (!preferences) return

    setSaving(true)
    setMessage('')
    setError('')

    const result = await updateMyAlertPreferences({ preferences })
    setSaving(false)

    if (!result.success) {
      setError(result.error ?? 'Failed to save preferences')
      return
    }

    setMessage('Preferences saved successfully')
    onPreferencesChange?.(preferences)
  }

  async function handleReset() {
    setSaving(true)
    setMessage('')
    setError('')

    const result = await resetMyAlertPreferences()
    setSaving(false)

    if (!result.success || !result.data) {
      setError(result.error ?? 'Failed to reset preferences')
      return
    }

    setPreferences(result.data)
    onPreferencesChange?.(result.data)
    setMessage('Preferences reset to defaults')
  }

  if (loading) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Loading alert preferences...</div>
  }

  if (!preferences) {
    return <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Unable to load alert preferences.</div>
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Alert Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Configure which supervisor alerts are shown and tune alert sensitivity.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {alertTypeFields.map((field) => (
          <label key={field.key} className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={preferences.enabledAlertTypes[field.key]}
              onChange={(event) => updateAlertType(field.key, event.target.checked)}
            />
            {field.label}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {thresholdFields.map((field) => (
          <label key={field.key} className="text-sm text-foreground">
            {field.label}
            <input
              type="number"
              min={field.min}
              max={field.max}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
              value={preferences.thresholds[field.key]}
              onChange={(event) => updateThreshold(field.key, Number(event.target.value || 0))}
            />
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-500">{message}</p>}

      <div className="flex gap-2">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
          Reset to Defaults
        </Button>
      </div>
    </section>
  )
}
