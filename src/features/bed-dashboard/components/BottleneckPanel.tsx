// Bottleneck Panel Component
// Epic 1: Nurse Desk Bed Dashboard (US-1.6)
// Purpose: Shows patients stuck in Decision Made >30 min with reason dropdown

'use client'

import { useState, useTransition } from 'react'
import { Hourglass, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { DISPOSITION_DELAY_REASON_LABELS } from '../types/bed'
import { formatElapsedTime } from '../lib/utils'
import { recordDispositionDelayReason } from '../actions/disposition-actions'

interface BottleneckPanelProps {
  beds: BedWithElapsedTime[]
  onReasonRecorded?: () => void
}

const REASON_OPTIONS = Object.entries(DISPOSITION_DELAY_REASON_LABELS) as [
  DispositionDelayReason,
  string,
][]

export function BottleneckPanel({ beds, onReasonRecorded }: BottleneckPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [savingBedId, setSavingBedId] = useState<string | null>(null)
  const [errorByBedId, setErrorByBedId] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  const bottleneckBeds = beds.filter(b => b.isDispositionBottleneck)

  if (bottleneckBeds.length === 0) return null

  async function handleReasonChange(bedId: string, reason: DispositionDelayReason) {
    setSavingBedId(bedId)
    setErrorByBedId(prev => ({ ...prev, [bedId]: '' }))

    const result = await recordDispositionDelayReason({ bedId, reason })

    setSavingBedId(null)

    if (!result.success) {
      setErrorByBedId(prev => ({ ...prev, [bedId]: result.error ?? 'Failed to save' }))
      return
    }

    startTransition(() => {
      onReasonRecorded?.()
    })
  }

  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-950/30">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-300">
            Disposition Hold
          </span>
          <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
            {bottleneckBeds.length}
          </span>
          <span className="text-xs text-amber-400/70">
            patient{bottleneckBeds.length !== 1 ? 's' : ''} waiting for beds upstairs
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-amber-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-400" />
        )}
      </button>

      {/* Expanded table */}
      {isExpanded && (
        <div className="border-t border-amber-700/30 px-4 pb-4">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left text-xs text-amber-400/60 uppercase tracking-wider">
                <th className="pb-2 pr-4 font-medium">Bed</th>
                <th className="pb-2 pr-4 font-medium">Time in Stage</th>
                <th className="pb-2 font-medium">Reason for Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/30">
              {bottleneckBeds.map(bed => (
                <tr key={bed.id}>
                  <td className="py-2 pr-4 font-bold text-white">{bed.bedNumber}</td>
                  <td className="py-2 pr-4 text-amber-300 font-mono">
                    {formatElapsedTime(bed.dispositionElapsedMs)}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col gap-1">
                      <select
                        className={cn(
                          'rounded border border-amber-700/50 bg-zinc-900 px-2 py-1 text-xs text-zinc-200',
                          'focus:outline-none focus:ring-1 focus:ring-amber-500',
                          'disabled:opacity-50'
                        )}
                        value={bed.dispositionDelayReason ?? ''}
                        disabled={savingBedId === bed.id}
                        onChange={e =>
                          handleReasonChange(bed.id, e.target.value as DispositionDelayReason)
                        }
                      >
                        <option value="" disabled>
                          Select reason…
                        </option>
                        {REASON_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {errorByBedId[bed.id] && (
                        <p className="text-[10px] text-red-400">{errorByBedId[bed.id]}</p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
