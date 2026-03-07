'use client'
// DelayedPatientTargetConfig — US-10.3
// Admin-only inline widget to view and update the delay target percentage.

import { useState, useCallback, useEffect } from 'react'
import { Settings, Check, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { saveDelayTargetPctAction } from '../actions/delayed-patients-actions'
import { logger } from '@/shared/config/logger'

interface DelayedPatientTargetConfigProps {
  targetPct: number | null
  onSaved: () => void
}

export function DelayedPatientTargetConfig({ targetPct, onSaved }: DelayedPatientTargetConfigProps) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInput(targetPct !== null ? String(targetPct) : '')
  }, [targetPct])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const pct = input.trim() === '' ? null : Number(input)
      if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) {
        setError('Enter a percentage between 0 and 100')
        return
      }
      const result = await saveDelayTargetPctAction(pct)
      if (!result.success) throw new Error(result.error)
      setEditing(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      logger.error('Failed to save delay target pct', err as Error)
    } finally {
      setSaving(false)
    }
  }, [input, onSaved])

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditing(true)}
        className="text-muted-foreground hover:text-card-foreground h-7 px-2"
      >
        <Settings className="h-3.5 w-3.5 mr-1" />
        <span className="text-[10px]">
          {targetPct !== null ? `Target: ${targetPct}%` : 'Set Target %'}
        </span>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-muted border border-border rounded px-3 py-1.5">
      <label className="text-[10px] text-muted-foreground whitespace-nowrap">Target %:</label>
      <input
        type="number"
        min="0"
        max="100"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. 20"
        className="w-16 bg-card border border-border rounded px-2 py-0.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {error && <span className="text-[10px] text-red-400">{error}</span>}
      <Button size="sm" onClick={handleSave} disabled={saving} className="h-6 px-2 text-[10px]">
        <Check className="h-3 w-3 mr-1" />
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setEditing(false); setError(null) }}
        className="h-6 px-1.5 text-muted-foreground hover:text-card-foreground"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
