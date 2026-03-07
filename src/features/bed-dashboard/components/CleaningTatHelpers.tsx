// Cleaning TAT Helper Components
// US-2.4: Track Bed Cleaning and Turnaround Time
// Extracted from TatAnalyticsView to stay under 200-line limit

import { Card, CardContent, CardDescription, CardHeader } from '@/shared/components/ui/card'
import { formatDuration } from '../lib/analytics-utils'
import type { TatRecord } from '../types/bed'

/** Single metric card used in the cleaning TAT summary grid */
export function CleaningTatSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

/** Table showing individual cleaning TAT records */
export function CleaningTatRecordsTable({ records }: { records: TatRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Bed</th>
            <th className="px-4 py-2 text-left font-medium">TAT</th>
            <th className="px-4 py-2 text-left font-medium">Cleaning</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={`${r.bedId}-${i}`} className="border-t border-zinc-100">
              <td className="px-4 py-2 font-medium">{r.bedNumber}</td>
              <td className="px-4 py-2">{formatDuration(r.tatMs)}</td>
              <td className="px-4 py-2">
                {r.cleaningDurationMs ? formatDuration(r.cleaningDurationMs) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
