'use client'
// LosTargetConfig — Admin-only inline target configuration widget
// EPIC 10: Management Report Dashboard

import { useState, useCallback } from 'react'
import { Settings, Check, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { logger } from '@/shared/config/logger'
import { saveLosTarget } from '../actions/los-actions'

interface LosTargetConfigProps {
  currentTargetMinutes: number | null
  onSaved: () => void
}

export function LosTargetConfig({ currentTargetMinutes, onSaved }: LosTargetConfigProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string>(
    currentTargetMinutes !== null ? String(currentTargetMinutes) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const minutes = value.trim() === '' ? null : Number(value)
      if (minutes !== null && (isNaN(minutes) || minutes <= 0)) {
        setError('Please enter a positive number of minutes.')
        return
      }
      const result = await saveLosTarget(minutes)
      if (!result.success) throw new Error(result.error)
      setOpen(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      logger.error('Failed to save LoS target', err as Error)
    } finally {
      setSaving(false)
    }
  }, [value, onSaved])

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-card-foreground h-7 px-2"
        title="Configure LoS target"
      >
        <Settings className="h-3.5 w-3.5 mr-1" />
        <span className="text-[10px]">
          {currentTargetMinutes !== null ? `Target: ${currentTargetMinutes}m` : 'Set Target'}
        </span>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-muted border border-border rounded px-3 py-1.5">
      <label className="text-[10px] text-muted-foreground whitespace-nowrap">Target (min):</label>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 240"
        className={cn(
          'w-20 bg-card border border-border rounded px-2 py-0.5 text-xs text-card-foreground',
          'focus:outline-none focus:ring-1 focus:ring-blue-500',
        )}
      />
      {error && <span className="text-[10px] text-red-400">{error}</span>}
      <Button size="sm" onClick={handleSave} disabled={saving} className="h-6 px-2 text-[10px]">
        <Check className="h-3 w-3 mr-1" />
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setOpen(false); setError(null) }}
        className="h-6 px-1.5 text-muted-foreground hover:text-card-foreground"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
