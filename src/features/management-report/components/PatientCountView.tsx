'use client'
// Patient Count View (US-10.1)
// Epic 10: Management Report Dashboard
//
// Container: renders filters/toolbar + delegates data-loading to
// usePatientCountData and display to PatientCountCards.

import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle, RefreshCw, Users } from 'lucide-react'
import { formatShiftTime } from '@/shared/lib/shift-format'
import { cn } from '@/shared/lib/utils'
import { usePatientCountData, PRESETS } from '../hooks/usePatientCountData'
import { PatientCountCards } from './PatientCountCards'
import { SignOffBadge } from './SignOffBadge'
import { ReportSignOffButton } from './ReportSignOffButton'
import type { Shift } from '@/shared/types/shift.types'
import type { ReportSignOff } from '../types/report.types'
import { ExportReportButton } from '@/features/export/components/ExportReportButton'

interface PatientCountViewProps {
  /** Active shifts passed from the server component */
  shifts: Shift[]
  /** ISO date YYYY-MM-DD for sign-off (defaults to today) */
  reportDate?: string
  /** Existing sign-off record fetched server-side */
  initialSignOff?: ReportSignOff | null
  readOnly?: boolean
  className?: string
}

export function PatientCountView({
  shifts,
  reportDate = new Date().toISOString().slice(0, 10),
  initialSignOff = null,
  readOnly = false,
  className,
}: PatientCountViewProps) {
  const {
    preset, setPreset,
    selectedShiftId, setSelectedShiftId,
    selectedPreset,
    summary, loading, error, lastRefreshed,
    reload,
  } = usePatientCountData()

  const shiftLabel = selectedShiftId === 'all'
    ? 'All Shifts'
    : shifts.find(s => s.id === selectedShiftId)?.name ?? 'Unknown'

  const periodLabel = `Patients Treated — ${selectedPreset.label} · ${shiftLabel}`

  return (
    <div className={cn('space-y-4', className)} data-export-id="export-patients">
      {/* Section header + toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            Total Patients Treated
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Completed stays from the patient admissions archive
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(p => (
            <Button
              key={p.value}
              size="sm"
              variant={preset === p.value ? 'default' : 'outline'}
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}

          <select
            value={selectedShiftId}
            onChange={e => setSelectedShiftId(e.target.value)}
            className={cn(
              'h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1',
              'text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          >
            <option value="all">All Shifts</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({formatShiftTime(s.start_time, s.end_time)})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="ghost"
            onClick={reload}
            disabled={loading}
            title="Refresh now"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>

          <ExportReportButton
            scope="patients"
            pdfSections={[{ exportId: 'export-patients', title: 'Total Patients Treated' }]}
            pdfTitle="Patient Count Report"
            shiftId={selectedShiftId}
            label="Export"
            disabled={readOnly}
          />

          {/* Sign-off button — only visible for supervisor/admin */}
          <ReportSignOffButton
            reportDate={reportDate}
            initialSignOff={initialSignOff}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Active sign-off badge */}
      {initialSignOff && (
        <SignOffBadge signOff={initialSignOff} />
      )}

      {/* Error state */}
      {error && (
        <Card className="border-red-800 bg-red-950/40">
          <CardContent className="pt-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      <PatientCountCards
        summary={summary}
        loading={loading}
        lastRefreshed={lastRefreshed}
        periodLabel={periodLabel}
      />
    </div>
  )
}
