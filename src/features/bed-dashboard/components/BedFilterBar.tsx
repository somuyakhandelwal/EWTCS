// Bed Filter Bar Component
// US-1.4: Filter and Sort Delayed Beds

import { memo } from 'react'
import { Filter, ArrowDownWideNarrow, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { SortOrder } from '../hooks/useBedFilter'

interface BedFilterBarProps {
  showDelayedOnly: boolean
  sortOrder: SortOrder
  delayedCount: number
  isFilterActive: boolean
  onToggleFilter: () => void
  onToggleSortOrder: () => void
  onClear: () => void
}

/**
 * Filter and sort controls for the bed dashboard.
 * Rendered inside BedGrid header; extracted to keep BedGrid under the 200-line limit.
 */
export const BedFilterBar = memo(function BedFilterBar({
  showDelayedOnly,
  sortOrder,
  delayedCount,
  isFilterActive,
  onToggleFilter,
  onToggleSortOrder,
  onClear,
}: BedFilterBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* AC: "Show Delayed Only" filter toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleFilter}
        className={cn(showDelayedOnly && 'bg-red-900/30 border-red-700 text-red-300')}
      >
        <Filter className="h-4 w-4 mr-2" />
        {showDelayedOnly ? 'Delayed Only' : 'Show Delayed Only'}
        {delayedCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
            {delayedCount}
          </span>
        )}
      </Button>

      {/* AC: Sort delayed beds by duration (longest delay first) */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleSortOrder}
        className={cn(sortOrder === 'desc' && 'bg-amber-900/30 border-amber-700 text-amber-300')}
        title="Sort beds by elapsed time — longest wait first"
      >
        <ArrowDownWideNarrow className="h-4 w-4 mr-2" />
        {sortOrder === 'desc' ? 'Sorted by Delay' : 'Sort by Delay'}
      </Button>

      {/* AC: Clear indication when filter is active + one-click to clear */}
      {isFilterActive && (
        <>
          <span className="text-xs font-medium px-2 py-1 rounded bg-amber-900/20 border border-amber-700/30 text-amber-400">
            Filter Active
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-zinc-400 hover:text-white"
            title="Clear all filters and sorting"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </>
      )}
    </div>
  )
})
