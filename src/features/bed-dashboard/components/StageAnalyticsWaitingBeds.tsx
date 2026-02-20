'use client'

// Longest Waiting Beds Component
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import { formatDuration } from '../lib/analytics-utils'
import { cn } from '@/shared/lib/utils'

interface WaitingBed {
  bedNumber: string
  bedId: string
  currentStageName: string
  currentStageId: string
  waitTimeMs: number
  transitionTime: Date
}

interface StageAnalyticsWaitingBedsProps {
  beds: WaitingBed[] | null
  selectedBedId: string | null
  onSelectBed: (bedId: string) => void
  readOnly?: boolean
}

export function StageAnalyticsWaitingBeds({
  beds,
  selectedBedId,
  onSelectBed,
}: StageAnalyticsWaitingBedsProps) {
  const renderBeds = () => {
    if (!beds || beds.length === 0) {
      return <p className="text-sm text-zinc-600">No occupied beds</p>
    }

    return beds.map((bed) => (
      <button
        key={bed.bedId}
        onClick={() => onSelectBed(bed.bedId)}
        className={cn(
          'w-full text-left p-3 rounded-lg border transition-colors hover:bg-zinc-50',
          selectedBedId === bed.bedId && 'border-blue-500 bg-blue-50'
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm">{bed.bedNumber}</span>
          <Badge variant="secondary">{formatDuration(bed.waitTimeMs)}</Badge>
        </div>
        <p className="text-xs text-zinc-600">{bed.currentStageName}</p>
      </button>
    ))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Longest Waiting Beds
        </CardTitle>
        <CardDescription>Currently in stage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">{renderBeds()}</div>
      </CardContent>
    </Card>
  )
}
