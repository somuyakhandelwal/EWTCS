'use client'

// US-13.4: Two-click restore button for the Backup Status Panel.
// First click arms confirmation (button turns red). Second click triggers restore.
// Cancel link resets to safe state.

import { useState } from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'

interface Props {
  filename: string
  onTriggered: () => void
}

export function BackupRestoreButton({ filename, onTriggered }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [restoring,  setRestoring]  = useState(false)
  const [msg,        setMsg]        = useState<string | null>(null)

  const handleClick = async () => {
    if (!confirming) { setConfirming(true); return }
    setRestoring(true)
    setConfirming(false)
    try {
      const res  = await fetch('/api/backup/restore', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ filename }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')
      setMsg('Started — check logs/restore.log for progress.')
      setTimeout(() => { setMsg(null); onTriggered() }, 8_000)
    } catch (err) {
      setMsg((err as Error).message)
      setTimeout(() => setMsg(null), 6_000)
    } finally {
      setRestoring(false)
    }
  }

  if (msg) {
    return <span className="text-xs text-muted-foreground italic">{msg}</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
      <button
        onClick={handleClick}
        disabled={restoring}
        title={confirming ? `Confirm: overwrite live DB with ${filename}` : 'Restore this backup'}
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium
          transition-colors disabled:opacity-50
          ${confirming
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/40'
          }`}
      >
        {restoring
          ? <><RotateCcw className="h-3 w-3 animate-spin" /> Restoring…</>
          : confirming
            ? <><AlertTriangle className="h-3 w-3" /> Confirm Restore</>
            : <><RotateCcw className="h-3 w-3" /> Restore</>}
      </button>
    </div>
  )
}
