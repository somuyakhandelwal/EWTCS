// Notification Preferences Form
// EPIC 15: Notifications & Alerts (US-15.5)
// Purpose: Client form to toggle alert types and set custom thresholds.

'use client'

import { useState, useTransition } from 'react'
import { RotateCcw, Save, BellOff, Bell } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  updateNotificationPreferencesAction,
  resetNotificationPreferencesAction,
} from '../actions/notification-preference-actions'
import { ALERT_TYPE_DESCRIPTIONS, ALERT_TYPES, DEFAULT_USER_PREFERENCES } from '../types/notification-preferences'
import type { UserPreferenceMap } from '../types/notification-preferences'
import type { AlertType } from '@/features/alerts/types/alert'

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
            <div
              key={type}
              className={cn(
                'rounded-lg border p-4 sm:p-5 space-y-4 transition-colors',
                pref.enabled
                  ? 'border-zinc-700 bg-zinc-900/60'
                  : 'border-zinc-800 bg-zinc-950/40 opacity-60'
              )}
            >
              {/* Toggle row */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {pref.enabled ? (
                      <Bell className="h-4 w-4 text-green-400 shrink-0" />
                    ) : (
                      <BellOff className="h-4 w-4 text-zinc-500 shrink-0" />
                    )}
                    <p className="text-sm font-semibold text-white">{label}</p>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-snug">{description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pref.enabled}
                  aria-label={`${pref.enabled ? 'Disable' : 'Enable'} ${label} alerts`}
                  onClick={() => toggleEnabled(type)}
                  disabled={isPending}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                    'transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    pref.enabled ? 'bg-green-600' : 'bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
                      'transition duration-200 ease-in-out',
                      pref.enabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* Threshold input (only shown when enabled) */}
              {pref.enabled && (
                <div className="flex items-center gap-3">
                  <label
                    htmlFor={`threshold-${type}`}
                    className="text-xs text-zinc-400 whitespace-nowrap"
                  >
                    Min. delay before alert
                  </label>
                  <input
                    id={`threshold-${type}`}
                    type="number"
                    min={1}
                    max={1440}
                    placeholder="System default"
                    value={pref.minDelayThresholdMinutes ?? ''}
                    onChange={(e) => setThreshold(type, e.target.value)}
                    disabled={isPending}
                    className={cn(
                      'w-36 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5',
                      'text-xs text-white placeholder:text-zinc-500',
                      'focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500',
                      'disabled:opacity-50'
                    )}
                  />
                  <span className="text-xs text-zinc-500">minutes (blank = system default)</span>
                </div>
              )}
            </div>
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
