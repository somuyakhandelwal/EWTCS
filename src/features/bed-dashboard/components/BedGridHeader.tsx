'use client'

import { Button } from '@/shared/components/ui/button'
import { Filter, RefreshCw } from 'lucide-react'

interface BedGridHeaderProps {
  showDelayedOnly: boolean
  delayedCount: number
  isRefreshing: boolean
  onToggleFilter: () => void
  onRefresh?: () => void
}

export function BedGridHeader({
  showDelayedOnly,
  delayedCount,
  isRefreshing,
  onToggleFilter,
  onRefresh,
}: BedGridHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilter}
          className={showDelayedOnly ? 'bg-red-900/30 border-red-700' : ''}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showDelayedOnly ? 'Show All Beds' : 'Show Delayed Only'}
          {delayedCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {delayedCount}
            </span>
          )}
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  )
}
