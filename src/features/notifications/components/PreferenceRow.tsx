'use client'
// Notification Preference Row — single alert-type toggle + threshold input
// US-15.5: Per-type enable/disable and custom delay threshold

import { Bell, BellOff } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { AlertType, UserPreferenceMap } from '../types/notification-preferences'

type UserPreference = UserPreferenceMap[AlertType]

interface Props {
    type: AlertType
    pref: UserPreference
    label: string
    description: string
    isPending: boolean
    onToggle: () => void
    onThresholdChange: (value: string) => void
}

export function PreferenceRow({ type, pref, label, description, isPending, onToggle, onThresholdChange }: Props) {
    return (
        <div
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
                    onClick={onToggle}
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
                        onChange={(e) => onThresholdChange(e.target.value)}
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
}
