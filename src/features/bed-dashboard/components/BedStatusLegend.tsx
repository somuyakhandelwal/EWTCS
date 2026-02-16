// Bed Status Legend Component
// Epic 1: Nurse Desk Bed Dashboard

import { memo } from 'react'
import type { Stage } from '../types/bed'
import { getStageColorClasses } from '../lib/utils'
import { cn } from '@/shared/lib/utils'

interface BedStatusLegendProps {
  stages: Stage[]
}

export const BedStatusLegend = memo(function BedStatusLegend({ stages }: BedStatusLegendProps) {
  return (
    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Stage Legend</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {stages.map((stage) => {
          const colorClasses = getStageColorClasses(stage.colorCode)
          return (
            <div
              key={stage.id}
              className="flex items-center gap-2 group cursor-help"
              title={stage.description || stage.name}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border-2',
                  colorClasses.bg,
                  colorClasses.border
                )}
              />
              <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                {stage.name}
              </span>
            </div>
          )
        })}
      </div>
      
      {/* Delay indicator */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-red-700 bg-red-900/50 animate-pulse" />
          <span className="text-xs text-zinc-400">
            Delayed (&gt;3 hours)
          </span>
        </div>
      </div>
    </div>
  )
})


