'use client'
// SignOffBadge — display component for an approved sign-off status
// Epic 12: Audit Logs & Compliance

import { CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ReportSignOff } from '../types/report.types'

interface SignOffBadgeProps {
    signOff: ReportSignOff
    className?: string
}

function formatSignOffTime(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(new Date(date))
}

export function SignOffBadge({ signOff, className }: SignOffBadgeProps) {
    const isApproved = signOff.status === 'approved'

    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-lg border px-4 py-3',
                isApproved
                    ? 'border-emerald-800/60 bg-emerald-950/40'
                    : 'border-border bg-card',
                className
            )}
        >
            {isApproved ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            <div className="min-w-0 text-sm leading-snug">
                <span
                    className={cn(
                        'font-semibold',
                        isApproved ? 'text-emerald-400' : 'text-muted-foreground'
                    )}
                >
                    {isApproved ? 'Approved' : 'Superseded'}
                </span>

                <span className="mx-1 text-muted-foreground">·</span>

                <span className="text-card-foreground">
                    {signOff.signedOffByUsername ?? 'Unknown supervisor'}
                </span>

                <span className="mx-1 text-muted-foreground">·</span>

                <span className="text-muted-foreground">
                    {formatSignOffTime(signOff.signedOffAt)}
                </span>

                {signOff.notes && (
                    <p className="mt-1 text-muted-foreground italic truncate" title={signOff.notes}>
                        &ldquo;{signOff.notes}&rdquo;
                    </p>
                )}
            </div>
        </div>
    )
}
