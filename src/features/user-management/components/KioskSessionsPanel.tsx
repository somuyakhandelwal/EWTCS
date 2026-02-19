'use client'

// Kiosk Sessions Panel
// Epic 5: Authentication & Role-Based Access (US-5.3)
// Purpose: Admin UI to view and revoke active kiosk sessions

import { useState, useEffect, useTransition } from 'react'
import { Monitor, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  getActiveKioskSessionsAction,
  revokeKioskSessionAction,
} from '../actions/kiosk-admin-actions'

interface KioskSession {
  id: string
  username: string
  boundIp: string
  createdAt: string
}

export function KioskSessionsPanel() {
  const [sessions, setSessions] = useState<KioskSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function load() {
    setIsLoading(true)
    const result = await getActiveKioskSessionsAction()
    setSessions(result.sessions as KioskSession[])
    setIsLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleRevoke(id: string) {
    setRevokingId(id)
    setError(null)
    const result = await revokeKioskSessionAction(id)
    if (!result.success) setError(result.error ?? 'Failed to revoke')
    setRevokingId(null)
    startTransition(() => { void load() })
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-200">Active Kiosk Sessions</span>
          {sessions.length > 0 && (
            <span className="rounded-full bg-emerald-900/40 border border-emerald-700/50 px-2 py-0.5 text-xs text-emerald-300">
              {sessions.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {error && <p className="px-4 py-2 text-xs text-red-400">{error}</p>}

      {sessions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">
          {isLoading ? 'Loading…' : 'No active kiosk sessions'}
        </p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200">{s.username}</p>
                <p className="text-xs text-zinc-500 font-mono">{s.boundIp}</p>
                <p className="text-[10px] text-zinc-600">
                  Since {new Date(s.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 shrink-0"
                onClick={() => void handleRevoke(s.id)}
                disabled={revokingId === s.id}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
