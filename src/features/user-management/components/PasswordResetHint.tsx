'use client'

import { KeyRound } from 'lucide-react'

export function PasswordResetHint() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground">
      <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
      To change a user&apos;s password, use the{' '}
      <span className="font-medium text-amber-400/80">Reset Password</span>{' '}
      button on the user list.
    </div>
  )
}