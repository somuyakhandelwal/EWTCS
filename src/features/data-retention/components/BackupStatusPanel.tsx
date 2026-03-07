'use client'

// US-13.4: Backup Status Panel — Admin UI
// Shows last backup time, file list, and manual trigger button.
// Reads from GET /api/backup/status; triggers via POST /api/backup/status.

import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, RefreshCw, Play, FileArchive, Clock } from 'lucide-react'
import { BackupRestoreButton } from './BackupRestoreButton'

interface BackupFile {
  name: string
  sizeKB: number
  createdAt: string
  encrypted: boolean
}

interface BackupStatus {
  backupDir: string
  totalFiles: number
  totalKB: number
  latest: BackupFile | null
  files: BackupFile[]
  encryptionEnabled: boolean
  retentionDays: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ago`
  if (h > 0)   return `${h}h ${m}m ago`
  return `${m}m ago`
}

export function BackupStatusPanel() {
  const [status,      setStatus]      = useState<BackupStatus | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [triggering,  setTriggering]  = useState(false)
  const [triggerMsg,  setTriggerMsg]  = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/backup/status', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus(await res.json())
      setError(null)
    } catch {
      setError('Could not load backup status. Check server logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleTrigger = async () => {
    setTriggering(true)
    setTriggerMsg(null)
    try {
      const res  = await fetch('/api/backup/status', { method: 'POST' })
      const data = await res.json()
      setTriggerMsg(data.message ?? 'Backup started.')
      // Refresh status after 35s so the new file appears
      setTimeout(() => { fetchStatus(); setTriggerMsg(null) }, 35_000)
    } catch {
      setTriggerMsg('Failed to trigger backup. Run: npm run backup:run')
    } finally {
      setTriggering(false)
    }
  }

  const noSetup = !loading && status?.totalFiles === 0

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Last backup</p>
            <p className="text-sm font-medium text-foreground">
              {status?.latest ? timeSince(status.latest.createdAt) : 'Never'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <FileArchive className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Stored</p>
            <p className="text-sm font-medium text-foreground">
              {status ? `${status.totalFiles} file${status.totalFiles !== 1 ? 's' : ''} · ${(status.totalKB / 1024).toFixed(1)} MB` : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <ShieldCheck className={`h-5 w-5 shrink-0 ${status?.encryptionEnabled ? 'text-green-500' : 'text-yellow-500'}`} />
          <div>
            <p className="text-xs text-muted-foreground">Encryption</p>
            <p className="text-sm font-medium text-foreground">
              {status?.encryptionEnabled ? 'AES-256 on' : 'Off (set ENCRYPTION_KEY)'}
            </p>
          </div>
        </div>
      </div>

      {/* Setup prompt */}
      {noSetup && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          No backups found yet. Add <code className="font-mono">BACKUP_PATH</code> to <code className="font-mono">.env.local</code> then run{' '}
          <code className="font-mono">npm run backup:setup</code> to schedule automatic backups, or click Run Now to create one immediately.
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Trigger row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium
                     text-primary-foreground shadow-sm transition-opacity
                     hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {triggering
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Starting…</>
            : <><Play className="h-4 w-4" /> Run Backup Now</>}
        </button>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm
                     text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        {triggerMsg && (
          <span className="text-sm text-muted-foreground">{triggerMsg}</span>
        )}
      </div>

      {/* Recent files table */}
      {status && status.files.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">File</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Size</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Created</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {status.files.map((f, i) => (
                <tr key={f.name} className={i % 2 === 0 ? '' : 'bg-muted/10'}>
                  <td className="px-3 py-2 font-mono text-xs text-foreground flex items-center gap-1.5">
                    {f.encrypted && <ShieldCheck className="h-3 w-3 text-green-500 shrink-0" />}
                    {f.name}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{f.sizeKB} KB</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatDate(f.createdAt)}</td>
                  <td className="px-3 py-2 text-right">
                    <BackupRestoreButton filename={f.name} onTriggered={fetchStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer info */}
      {status && (
        <p className="text-xs text-muted-foreground">
          Storage: <span className="font-mono">{status.backupDir}</span> · Retention: {status.retentionDays} days ·
          To change, set <span className="font-mono">BACKUP_PATH</span> and <span className="font-mono">BACKUP_RETENTION_DAYS</span> in <span className="font-mono">.env.local</span>
        </p>
      )}
    </div>
  )
}
