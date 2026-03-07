'use client'

// HeatmapDrillDown — modal showing individual admissions for a selected heatmap cell
// EPIC 10: Management Report Dashboard

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { X, Clock } from 'lucide-react'
import type { HeatmapDrillDownRecord } from '../types/heatmap.types'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDuration(ms: number): string {
  const hrs = Math.floor(ms / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
}

function formatAdmittedAt(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface HeatmapDrillDownProps {
  dayOfWeek: number
  hourOfDay: number
  records: HeatmapDrillDownRecord[]
  loading: boolean
  onClose: () => void
}

export function HeatmapDrillDown({
  dayOfWeek, hourOfDay, records, loading, onClose,
}: HeatmapDrillDownProps) {
  const hourStr = String(hourOfDay).padStart(2, '0')
  // Bug fix: when hourOfDay is 23, (23 + 1) % 24 = 0 → displays "23:00 – 00:00"
  // instead of the incorrect "23:00 – 24:00".
  const nextHour = String((hourOfDay + 1) % 24).padStart(2, '0')
  const label = `${DAY_NAMES[dayOfWeek]}  ${hourStr}:00 – ${nextHour}:00`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Drill-down: ${label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-xl bg-card border-border max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3 shrink-0">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400 shrink-0" />
            {label}
            <span className="text-muted-foreground font-normal">
              ({records.length} admission{records.length !== 1 ? 's' : ''})
            </span>
          </CardTitle>
          <Button
            variant="ghost" size="sm" onClick={onClose}
            className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
            aria-label="Close drill-down"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Body */}
        <CardContent className="overflow-y-auto p-0 flex-1">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No admissions recorded for this slot.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="text-muted-foreground">
                  <th className="px-4 py-2 text-left">Bed</th>
                  <th className="px-4 py-2 text-left">Admitted</th>
                  <th className="px-4 py-2 text-left">Stay</th>
                  <th className="px-4 py-2 text-left">Discharged by</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr
                    key={r.admissionId}
                    className="border-t border-border hover:bg-card transition-colors"
                  >
                    <td className="px-4 py-2 text-foreground font-medium">{r.bedNumber}</td>
                    <td className="px-4 py-2 text-card-foreground">{formatAdmittedAt(r.admittedAt)}</td>
                    <td className="px-4 py-2 text-card-foreground">{formatDuration(r.totalDurationMs)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.dischargedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
