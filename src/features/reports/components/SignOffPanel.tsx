'use client'
// Sign-Off Button & Panel
// US-12.4: Supervisor sign-off on management reports

import { useState, useTransition, useEffect } from 'react'
import { CheckCircle, ClipboardCheck } from 'lucide-react'
import { getSignOffAction, createSignOffAction } from '../actions/sign-off-actions'
import type { SignOff } from '../lib/sign-off-queries'

interface SignOffPanelProps {
    /** The "as-of" date for this sign-off (typically the report end date). */
    reportDate: string
    /** Initial sign-off loaded server-side; may be null. */
    initialSignOff?: SignOff | null
    /** Whether the current user has permission to sign off. */
    canSignOff: boolean
}

function formatTs(d: Date | string): string {
    return new Date(d).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

export function SignOffPanel({ reportDate, initialSignOff, canSignOff }: SignOffPanelProps) {
    const [signOff, setSignOff] = useState<SignOff | null | undefined>(initialSignOff)
    const [showForm, setShowForm] = useState(false)
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // Re-fetch sign-off when the report date changes
    useEffect(() => {
        setShowForm(false)
        setError(null)
        startTransition(async () => {
            const result = await getSignOffAction(reportDate)
            if (result.success) setSignOff(result.signOff ?? null)
        })
    }, [reportDate])

    function handleSubmit() {
        setError(null)
        startTransition(async () => {
            const result = await createSignOffAction({
                reportDate,
                notes: notes.trim() || undefined,
            })
            if (!result.success) {
                setError(result.error ?? 'Sign-off failed')
                return
            }
            setSignOff(result.signOff ?? null)
            setShowForm(false)
            setNotes('')
        })
    }

    return (
        <div className="no-print rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold text-zinc-200">Supervisor Sign-Off</span>
                <span className="text-xs text-zinc-500 ml-1">· as of {reportDate}</span>
            </div>

            {signOff ? (
                <div className="flex items-start gap-3 rounded-lg bg-green-900/20 border border-green-700/40 px-3 py-2.5">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                        <p className="text-sm text-green-300 font-medium">
                            Signed off by <span className="font-bold">{signOff.signedOffBy}</span>
                        </p>
                        <p className="text-xs text-zinc-400">{formatTs(signOff.signedOffAt)}</p>
                        {signOff.notes && (
                            <p className="text-xs text-zinc-300 mt-1 italic">&ldquo;{signOff.notes}&rdquo;</p>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-zinc-500 italic">No sign-off recorded for this date.</p>
            )}

            {canSignOff && !showForm && (
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600
                               text-white text-sm font-medium transition-colors"
                >
                    <ClipboardCheck className="h-4 w-4" />
                    {signOff ? 'Supersede Sign-Off' : 'Sign Off Report'}
                </button>
            )}

            {canSignOff && showForm && (
                <div className="space-y-3 rounded-lg border border-zinc-600 bg-zinc-800 p-3">
                    <label className="block text-xs font-medium text-zinc-300">
                        Notes <span className="text-zinc-500">(optional)</span>
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={1000}
                        rows={3}
                        disabled={isPending}
                        placeholder="Add any reviewer notes…"
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-700 text-zinc-100 text-sm px-3 py-2
                                   focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none
                                   placeholder:text-zinc-500 disabled:opacity-50"
                    />
                    {error && (
                        <p className="text-xs text-red-400">{error}</p>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 disabled:opacity-50
                                       text-white text-sm font-medium transition-colors"
                        >
                            {isPending ? 'Saving…' : 'Confirm Sign-Off'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setShowForm(false); setError(null) }}
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 text-sm
                                       hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export type { SignOffPanelProps }
