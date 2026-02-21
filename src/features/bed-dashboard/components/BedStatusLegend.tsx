import { memo, useState } from 'react'
import type { Stage } from '../types/bed'
import { getStageColorClasses } from '@/shared/utils/stage-colors'
import { cn } from '@/shared/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { StageIcon } from './StageIcon'

interface BedStatusLegendProps {
  stages: Stage[]
  delayThresholdMs?: number
  escalationThresholdMs?: number
}

export const BedStatusLegend = memo(function BedStatusLegend({
  stages,
  delayThresholdMs,
  escalationThresholdMs
}: BedStatusLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const thresholdLabel = delayThresholdMs
    ? `${Math.round(delayThresholdMs / 3600000)} hours`
    : '3 hours'
  const escalationThresholdLabel = escalationThresholdMs
    ? `${Math.round(escalationThresholdMs / 3600000)} hours`
    : '4 hours'
  return (
    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls="legend-content"
      >
        <h3 className="text-sm font-semibold text-zinc-300">Stage Legend</h3>
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {!isCollapsed && (
        <div id="legend-content" className="p-4 pt-0 animate-in slide-in-from-top-2 duration-200">
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
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                      colorClasses.bg,
                      colorClasses.border
                    )}
                  >
                    <StageIcon colorCode={stage.colorCode} className={cn("h-3.5 w-3.5", colorClasses.text)} />
                  </div>
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    {stage.name}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Delay indicator */}
          <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-fuchsia-700 bg-fuchsia-900/50 motion-safe:animate-pulse" />
              <span className="text-xs text-zinc-400">
                Critical Escalation (&gt;{escalationThresholdLabel})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-red-700 bg-red-900/50 motion-safe:animate-pulse" />
              <span className="text-xs text-zinc-400">
                Delayed (&gt;{thresholdLabel})
              </span>
            </div>
            {/* US-1.6: Disposition bottleneck key */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-amber-700 bg-amber-900/40 motion-safe:animate-pulse" />
              <span className="text-xs text-zinc-400">
                Disposition Hold (&gt;30 min in Decision Made)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})


