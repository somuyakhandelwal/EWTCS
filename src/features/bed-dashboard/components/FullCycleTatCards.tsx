// Full-Cycle TAT Summary Cards
// US-3.4: Track Bed Turnaround Time
// Displays aggregate TAT metrics (discharge → next admission)

import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader } from '@/shared/components/ui/card'
import { formatDuration } from '../lib/duration-formatters'
import type { FullCycleTatSummary } from '../types/bed'

interface FullCycleTatCardsProps {
  summary: FullCycleTatSummary
}

function SummaryCard({ label, value }: { label: string; value: string }) {
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

/**
 * Renders summary metric cards for full-cycle TAT.
 * Shows: total cycles, average, median, min, max, p90.
 */
function FullCycleTatCardsInner({ summary }: FullCycleTatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <SummaryCard label="Cycles" value={String(summary.totalCycles)} />
      <SummaryCard label="Avg TAT" value={formatDuration(summary.averageTatMs)} />
      <SummaryCard label="Median TAT" value={formatDuration(summary.medianTatMs)} />
      <SummaryCard label="Min TAT" value={formatDuration(summary.minTatMs)} />
      <SummaryCard label="Max TAT" value={formatDuration(summary.maxTatMs)} />
      <SummaryCard label="P90 TAT" value={formatDuration(summary.p90TatMs)} />
    </div>
  )
}

export const FullCycleTatCards = memo(FullCycleTatCardsInner)
