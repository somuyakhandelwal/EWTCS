'use client'
// ReportSignOffButton — supervisor sign-off CTA with inline confirmation
// Epic 12: Audit Logs & Compliance

import { useState, useTransition } from 'react'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { signOffReport } from '../actions/signoff-actions'
import { SignOffBadge } from './SignOffBadge'
import type { ReportSignOff } from '../types/report.types'

interface ReportSignOffButtonProps {
    /** ISO date YYYY-MM-DD of the report to sign off */
    reportDate: string
    reportType?: string
    /** Existing sign-off to display (null = not yet signed) */
    initialSignOff?: ReportSignOff | null
    /** Hide the button entirely (e.g. for auditor view) */
    readOnly?: boolean
    className?: string
}

export function ReportSignOffButton({
    reportDate,
    reportType = 'daily',
    initialSignOff = null,
    readOnly = false,
    className,
}: ReportSignOffButtonProps) {
    const [signOff, setSignOff] = useState<ReportSignOff | null>(initialSignOff)
    const [confirming, setConfirming] = useState(false)
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleOpenConfirm() {
        setConfirming(true)
        setError(null)
        setNotes('')
    }

    function handleCancel() {
        setConfirming(false)
        setError(null)
    }

    function handleSubmit() {
        startTransition(async () => {
            const result = await signOffReport({ reportDate, reportType, notes: notes || undefined })
            if (result.success && result.data) {
                setSignOff(result.data)
                setConfirming(false)
                setError(null)
            } else {
                setError(result.error ?? 'Sign-off failed. Please try again.')
            }
        })
    }

    // Show the badge if already signed off (and not re-confirming)
    if (signOff && !confirming) {
        return (
            <div className={cn('space-y-2', className)}>
                <SignOffBadge signOff={signOff} />
                {!readOnly && (
                    <button
                        onClick={handleOpenConfirm}
                        className="text-xs text-muted-foreground hover:text-card-foreground underline underline-offset-2 transition-colors"
                    >
                        Sign off again (supersede)
                    </button>
                )}
            </div>
        )
    }

    // Show confirmation panel
    if (confirming) {
        return (
            <div className={cn('rounded-lg border border-amber-800/50 bg-amber-950/30 p-4 space-y-3', className)}>
                <p className="text-sm font-medium text-amber-300">
                    Confirm sign-off for report: <span className="font-mono">{reportDate}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                    This action will be permanently recorded in the audit trail.
                </p>
                <textarea
                    placeholder="Optional notes (e.g. 'Reviewed and confirmed accuracy')"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                />
                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {error}
                    </div>
                )}
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="bg-emerald-700 hover:bg-emerald-600 text-foreground"
                    >
                        {isPending ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Signing off…</>
                        ) : (
                            <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Confirm Sign-Off</>
                        )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} disabled={isPending}>
                        Cancel
                    </Button>
                </div>
            </div>
        )
    }

    // Default: show the sign-off button
    if (readOnly) return null

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={handleOpenConfirm}
            className={cn(
                'border-emerald-800/60 text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300',
                className
            )}
        >
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Sign Off Report
        </Button>
    )
}
