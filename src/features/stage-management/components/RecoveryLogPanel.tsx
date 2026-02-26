'use client'

import { useEffect, useState } from 'react'
import { clearRecoveryLogs, getRecoveryLogs } from '@/shared/lib/recovery-draft'

type RecoveryLog = {
  timestamp: number
  event: string
  context?: Record<string, unknown>
}

const MAX_VISIBLE_LOGS = 10

function formatEvent(event: string): string {
  return event.replaceAll('_', ' ')
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

export function RecoveryLogPanel() {
  const [logs, setLogs] = useState<RecoveryLog[]>([])

  const loadLogs = () => {
    const nextLogs = getRecoveryLogs()
      .slice()
      .reverse()
      .slice(0, MAX_VISIBLE_LOGS)
    setLogs(nextLogs)
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleClearLogs = () => {
    if (typeof window !== 'undefined') {
      const shouldClear = window.confirm('Clear all recovery logs?')
      if (!shouldClear) return
    }
    clearRecoveryLogs()
    setLogs([])
  }

  return (
    <div className='p-4 rounded-lg border border-border bg-card mb-6'>
      <div className='flex items-center justify-between mb-3'>
        <h2 className='text-lg font-bold text-foreground'>Recovery Logs</h2>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={loadLogs}
            className='text-sm px-3 py-1 border border-border rounded-md hover:bg-muted text-foreground transition-colors'
          >
            Refresh
          </button>
          <button
            type='button'
            onClick={handleClearLogs}
            className='text-sm px-3 py-1 border border-red-900/50 rounded-md hover:bg-red-900/20 text-red-400 transition-colors'
          >
            Clear Logs
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No recovery events recorded yet.</p>
      ) : (
        <ul className='space-y-2'>
          {logs.map((log, index) => (
            <li key={`${log.timestamp}-${log.event}-${index}`} className='text-sm text-foreground'>
              <span className='font-medium'>{formatEvent(log.event)}</span>
              <span className='text-muted-foreground'> — {formatTimestamp(log.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}