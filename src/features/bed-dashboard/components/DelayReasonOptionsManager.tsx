'use client'

import { useState, useTransition } from 'react'
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { DelayReasonOption } from '../actions/delay-reason-options-actions'
import {
  addDelayReasonOption,
  toggleDelayReasonOption,
  deleteDelayReasonOption,
} from '../actions/delay-reason-options-actions'

interface Props {
  initialOptions: DelayReasonOption[]
}

export function DelayReasonOptionsManager({ initialOptions }: Props) {
  const [options, setOptions] = useState(initialOptions)
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  async function handleAdd() {
    setError('')
    if (!newLabel.trim()) { setError('Label is required'); return }

    const maxOrder = options.length > 0 ? Math.max(...options.map(o => o.displayOrder)) : 0
    const result = await addDelayReasonOption({
      value: newLabel,
      label: newLabel.trim(),
      displayOrder: maxOrder + 1,
    })

    if (!result.success) { setError(result.error ?? 'Failed to add'); return }

    startTransition(() => {
      setOptions(prev => [...prev, {
        id: crypto.randomUUID(),
        value: newLabel.trim().toLowerCase().replace(/\s+/g, '_'),
        label: newLabel.trim(),
        isActive: true,
        displayOrder: maxOrder + 1,
      }])
      setNewLabel('')
    })
  }

  async function handleToggle(id: string, current: boolean) {
    const result = await toggleDelayReasonOption(id, !current)
    if (!result.success) { setError(result.error ?? 'Failed to update'); return }
    setOptions(prev => prev.map(o => o.id === id ? { ...o, isActive: !current } : o))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this delay reason option?')) return
    const result = await deleteDelayReasonOption(id)
    if (!result.success) { setError(result.error ?? 'Failed to delete'); return }
    setOptions(prev => prev.filter(o => o.id !== id))
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Delay Reason Options</CardTitle>
        <p className="text-sm text-muted-foreground">
          These options appear in the nurse dropdown when a bed is flagged as a disposition hold.
          No free text is allowed — nurses must pick from this list.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>
        )}

        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {options.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-3">No options yet.</p>
          )}
          {options.map(opt => (
            <div key={opt.id} className="flex items-center justify-between px-4 py-2.5 bg-background">
              <div>
                <span className={opt.isActive ? 'text-foreground text-sm' : 'text-muted-foreground text-sm line-through'}>
                  {opt.label}
                </span>
                <span className="ml-2 text-[10px] text-muted-foreground font-mono">{opt.value}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(opt.id, opt.isActive)}
                  title={opt.isActive ? 'Deactivate' : 'Activate'}
                >
                  {opt.isActive
                    ? <Eye className="h-4 w-4 text-emerald-500" />
                    : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(opt.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="New reason label (e.g. No Paediatric Bed)"
            className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            maxLength={80}
          />
          <Button onClick={handleAdd} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}