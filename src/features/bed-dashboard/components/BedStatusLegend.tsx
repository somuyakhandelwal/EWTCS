import { memo, useState } from 'react'
import type { Stage } from '../types/bed'
import { getStageColorClasses } from '@/shared/utils/stage-colors'
import { cn } from '@/shared/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface BedStatusLegendProps {
  stages: Stage[]
}

export const BedStatusLegend = memo(function BedStatusLegend({ stages }: BedStatusLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

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
          <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-red-700 bg-red-900/50 animate-pulse" />
              <span className="text-xs text-zinc-400">
                Delayed (&gt;3 hours)
              </span>
            </div>
            {/* US-1.6: Disposition bottleneck key */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-amber-700 bg-amber-900/40 animate-pulse" />
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


