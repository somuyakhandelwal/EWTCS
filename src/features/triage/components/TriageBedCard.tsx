'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ClipboardEdit, Clock3, Eraser, UserPlus } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { TRIAGE_STATE_LABELS, TRIAGE_STATE_STYLES, type TriageBed } from '../types'

interface TriageBedCardProps {
  bed: TriageBed
  isPending: boolean
  onAssign: (bed: TriageBed) => void
  onEdit: (bed: TriageBed) => void
  onDecision: (bed: TriageBed) => void
  onTransition: (bed: TriageBed) => void
}

function formatElapsed(from: Date, now: Date) {
  const ms = Math.max(0, now.getTime() - new Date(from).getTime())
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

export function TriageBedCard({
  bed,
  isPending,
  onAssign,
  onEdit,
  onDecision,
  onTransition,
}: TriageBedCardProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const patientName = bed.patient?.patientName || 'No patient assigned'
  const complaint = bed.patient?.keySymptom || 'No complaint recorded'
  const category = bed.patient?.triageCategory
  const styles = TRIAGE_STATE_STYLES[bed.state]

  return (
    <Card className={`relative overflow-hidden rounded-lg border-2 bg-card text-card-foreground shadow-sm ${styles.border}`}>
      <div className={`absolute inset-y-0 left-0 w-1.5 ${styles.accent}`} aria-hidden="true" />
      <CardContent className="p-4 pl-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{bed.bedNumber}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>In state {formatElapsed(bed.lastStateChange, now)}</span>
            </div>
          </div>
          <Badge variant="outline" className={styles.badge}>
            {TRIAGE_STATE_LABELS[bed.state]}
          </Badge>
        </div>

        <div className="min-h-28 rounded-md border border-border bg-background/80 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{patientName}</p>
              {bed.patient?.patientUhid && (
                <p className="text-xs font-medium text-muted-foreground">UHID {bed.patient.patientUhid}</p>
              )}
            </div>
            {category && <Badge variant="secondary" className="shrink-0">{category}</Badge>}
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-foreground/80">{complaint}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {bed.state === 'empty' && (
            <Button className="sm:col-span-2" size="sm" onClick={() => onAssign(bed)} disabled={isPending}>
              <UserPlus className="h-4 w-4" /> Assign Patient
            </Button>
          )}
          {(bed.state === 'initial_treatment' || bed.state === 'decision_made') && (
            <Button size="sm" variant="outline" onClick={() => onEdit(bed)} disabled={isPending}>
              <ClipboardEdit className="h-4 w-4" /> Edit Details
            </Button>
          )}
          {bed.state === 'initial_treatment' && (
            <Button size="sm" onClick={() => onTransition(bed)} disabled={isPending}>
              <CheckCircle2 className="h-4 w-4" /> Mark Decision Made
            </Button>
          )}
          {bed.state === 'decision_made' && (
            <Button size="sm" onClick={() => onDecision(bed)} disabled={isPending}>
              <Eraser className="h-4 w-4" /> Record Decision Outcome
            </Button>
          )}
          {bed.state === 'cleaning' && (
            <Button className="sm:col-span-2" size="sm" onClick={() => onTransition(bed)} disabled={isPending}>
              <CheckCircle2 className="h-4 w-4" /> Cleaning Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
