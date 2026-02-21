// ShiftComparisonTable — Table and badges for ShiftComparisonView (US-8.4)
// Epic 8: Shift Management

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Trophy, TrendingDown } from 'lucide-react'
import { formatDuration } from '@/shared/lib/duration-formatters'
import { formatShiftTime } from '../lib/shift-format'
import { cn } from '@/shared/lib/utils'
import type { ShiftComparisonReport } from '@/shared/types/report.types'

function ShiftBadge({ type }: { type: 'best' | 'worst' }) {
  return type === 'best' ? (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-green-900/40 text-green-300 border border-green-800/50">
      <Trophy className="h-3 w-3" /> Best
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-red-900/40 text-red-300 border border-red-800/50">
      <TrendingDown className="h-3 w-3" /> Worst
    </span>
  )
}

interface ShiftComparisonTableProps {
  report: ShiftComparisonReport | null
  loading: boolean
}

export function ShiftComparisonTable({ report, loading }: ShiftComparisonTableProps) {
  return (
    <Card className="border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">All Shifts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-10 rounded bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : report && report.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Shift</th>
                  <th className="px-4 py-3 text-left">Time Range</th>
                  <th className="px-4 py-3 text-right">Patients</th>
                  <th className="px-4 py-3 text-right">Avg Stay</th>
                  <th className="px-4 py-3 text-right">Delays</th>
                  <th className="px-4 py-3 text-center">Indicator</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map(row => {
                  const isBest  = row.shiftId === report.bestShiftId
                  const isWorst = row.shiftId === report.worstShiftId
                  return (
                    <tr
                      key={row.shiftId}
                      className={cn(
                        'border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors',
                        isBest && 'bg-green-950/20',
                        isWorst && !isBest && 'bg-red-950/20'
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-100">{row.shiftName}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {formatShiftTime(row.startTime, row.endTime)}
                        {row.crossesMidnight && (
                          <span className="ml-1 text-xs text-amber-400">↺</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {row.patientsTreated}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300">
                        {formatDuration(row.avgTatMs)}
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-right font-medium',
                        row.delayCount === 0 ? 'text-green-400'
                          : row.delayCount <= 3 ? 'text-yellow-400'
                          : 'text-red-400'
                      )}>
                        {row.delayCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isBest  && <ShiftBadge type="best" />}
                        {isWorst && !isBest && <ShiftBadge type="worst" />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-zinc-500 text-sm">
            No shift data available for the selected period.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
