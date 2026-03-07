// Notification Preferences Form
// EPIC 15: Notifications & Alerts (US-15.5)
// Purpose: Client form to toggle alert types and set custom thresholds.

'use client'

import { useState, useTransition } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  updateNotificationPreferencesAction,
  resetNotificationPreferencesAction,
} from '../actions/notification-preference-actions'
import { ALERT_TYPE_DESCRIPTIONS, ALERT_TYPES, DEFAULT_USER_PREFERENCES } from '../types/notification-preferences'
import type { UserPreferenceMap } from '../types/notification-preferences'
import type { AlertType } from '@/features/alerts/types/alert'
import { PreferenceRow } from './PreferenceRow'

interface NotificationPreferencesFormProps {
  initialPreferences: UserPreferenceMap
}

export function NotificationPreferencesForm({
  initialPreferences,
}: NotificationPreferencesFormProps) {
  const [prefs, setPrefs] = useState<UserPreferenceMap>(initialPreferences)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleEnabled(type: AlertType) {
    setPrefs((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }))
    setSaveStatus('idle')
  }

  function setThreshold(type: AlertType, value: string) {
    const num = value === '' ? null : parseInt(value, 10)
    setPrefs((prev) => ({
      ...prev,
      [type]: { ...prev[type], minDelayThresholdMinutes: Number.isNaN(num as number) ? null : num },
    }))
    setSaveStatus('idle')
  }

  function handleSave() {
    startTransition(async () => {
      setSaveStatus('idle')
      setErrorMessage(null)

      const result = await updateNotificationPreferencesAction({
        preferences: ALERT_TYPES.map((type) => ({
          alertType: type,
          enabled: prefs[type].enabled,
          minDelayThresholdMinutes: prefs[type].minDelayThresholdMinutes,
        })),
      })

      if (result.success) {
        setSaveStatus('success')
      } else {
        setSaveStatus('error')
        setErrorMessage(result.error ?? 'Failed to save')
      }
    })
  }

  function handleReset() {
    startTransition(async () => {
      setSaveStatus('idle')
      setErrorMessage(null)

      const result = await resetNotificationPreferencesAction()

      if (result.success) {
        setPrefs({ ...DEFAULT_USER_PREFERENCES })
        setSaveStatus('success')
      } else {
        setSaveStatus('error')
        setErrorMessage(result.error ?? 'Failed to reset')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Preference rows */}
      <div className="space-y-4">
        {ALERT_TYPES.map((type) => {
          const pref = prefs[type]
          const { label, description } = ALERT_TYPE_DESCRIPTIONS[type]
          return (
            <PreferenceRow
              key={type}
              type={type}
              pref={pref}
              label={label}
              description={description}
              isPending={isPending}
              onToggle={() => toggleEnabled(type)}
              onThresholdChange={(v) => setThreshold(type, v)}
            />
          )
        })}
      </div>

      {/* Status message */}
      {saveStatus === 'success' && (
        <p className="text-sm text-green-400">Preferences saved successfully.</p>
      )}
      {saveStatus === 'error' && (
        <p className="text-sm text-red-400">{errorMessage ?? 'An error occurred.'}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-zinc-700 hover:bg-zinc-600 text-white"
          size="sm"
        >
          <Save className="h-4 w-4 mr-1.5" />
          {isPending ? 'Saving…' : 'Save Preferences'}
        </Button>
        <Button
          onClick={handleReset}
          disabled={isPending}
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
