// Activity Heatmap — US-10.6
// CSS grid heatmap: hour (0-23) × day of week (Sun-Sat).
// Intensity = count normalised to [0,1].

import type { HeatmapCell } from '../types/report'

interface ActivityHeatmapProps {
  heatmap: HeatmapCell[]
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function intensityClass(ratio: number): string {
  if (ratio === 0)    return 'bg-zinc-800'
  if (ratio < 0.15)  return 'bg-blue-950'
  if (ratio < 0.30)  return 'bg-blue-900'
  if (ratio < 0.50)  return 'bg-blue-700'
  if (ratio < 0.70)  return 'bg-blue-500'
  if (ratio < 0.85)  return 'bg-blue-400'
  return 'bg-blue-300'
}

export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  if (heatmap.length === 0) {
    return <p className="text-center text-zinc-500 text-sm py-8">No activity data for this period.</p>
  }

  // Build lookup map: `${dow}-${hour}` → count
  const lookup = new Map<string, number>()
  let maxCount = 1
  for (const cell of heatmap) {
    const key = `${cell.dow}-${cell.hour}`
    lookup.set(key, cell.count)
    if (cell.count > maxCount) maxCount = cell.count
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex ml-10 mb-1">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-zinc-600 leading-none">
              {h % 6 === 0 ? `${h}:00` : ''}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {Array.from({ length: 7 }, (_, dow) => (
          <div key={dow} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-10 text-[10px] text-zinc-500 shrink-0">{DOW_LABELS[dow]}</span>
            {Array.from({ length: 24 }, (_, hour) => {
              const count = lookup.get(`${dow}-${hour}`) ?? 0
              const ratio = count / maxCount
              return (
                <div
                  key={hour}
                  className={`flex-1 h-5 rounded-sm ${intensityClass(ratio)} transition-colors`}
                  title={`${DOW_LABELS[dow]} ${hour}:00 — ${count} transition${count !== 1 ? 's' : ''}`}
                />
              )
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px] text-zinc-600">Less</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
            <div key={r} className={`w-4 h-4 rounded-sm ${intensityClass(r)}`} />
          ))}
          <span className="text-[10px] text-zinc-600">More</span>
        </div>
      </div>
    </div>
  )
}
