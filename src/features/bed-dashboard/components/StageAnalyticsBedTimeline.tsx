'use client'

// Bed Stage Timeline Component
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { formatDuration } from '../lib/analytics-utils'
import type { BedStageTimeline, StageTransitionRecord } from '../lib/stage-analytics'

interface StageAnalyticsBedTimelineProps {
  timeline: BedStageTimeline | null
}

export function StageAnalyticsBedTimeline({ timeline }: StageAnalyticsBedTimelineProps) {
  if (!timeline) return null

  const renderTransitions = () => {
    if (!timeline.transitions || timeline.transitions.length === 0) {
      return <p className="text-sm text-zinc-600">No transitions recorded</p>
    }

    return timeline.transitions.map((transition: StageTransitionRecord, index: number) => (
      <div key={transition.id} className="flex gap-4 text-sm">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          {index < timeline.transitions.length - 1 && (
            <div className="w-0.5 h-12 bg-zinc-200 my-1" />
          )}
        </div>
        <div className="flex-1 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {transition.fromStageName || 'Start'} → {transition.toStageName}
            </span>
            <span className="text-xs text-zinc-600">
              {new Date(transition.transitionTime).toLocaleTimeString()}
            </span>
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Duration in this stage: <span className="font-mono">{formatDuration(transition.durationInCurrentStageMs)}</span>
          </div>
          {transition.notes && (
            <p className="text-xs text-zinc-500 mt-1 italic">Note: {transition.notes}</p>
          )}
        </div>
      </div>
    ))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{timeline.bedNumber} - Stage Timeline</CardTitle>
        <CardDescription>
          Total time: {formatDuration(timeline.totalTimeMs)} | {timeline.transitions.length} transitions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">{renderTransitions()}</div>
      </CardContent>
    </Card>
  )
}
