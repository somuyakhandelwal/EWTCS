'use client'

import { Button } from '@/shared/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { BedFilterBar } from './BedFilterBar'
import type { SortOrder } from '../hooks/useBedFilter'

interface BedGridHeaderProps {
  showDelayedOnly: boolean
  sortOrder: SortOrder
  delayedCount: number
  isFilterActive: boolean
  isRefreshing: boolean
  onToggleFilter: () => void
  onToggleSortOrder: () => void
  onClearFilter: () => void
  onRefresh?: () => void
}

export function BedGridHeader({
  showDelayedOnly,
  sortOrder,
  delayedCount,
  isFilterActive,
  isRefreshing,
  onToggleFilter,
  onToggleSortOrder,
  onClearFilter,
  onRefresh,
}: BedGridHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* AC: Filter bar — Show Delayed Only, Sort by Delay, Filter Active badge, Clear */}
      <BedFilterBar
        showDelayedOnly={showDelayedOnly}
        sortOrder={sortOrder}
        delayedCount={delayedCount}
        isFilterActive={isFilterActive}
        onToggleFilter={onToggleFilter}
        onToggleSortOrder={onToggleSortOrder}
        onClear={onClearFilter}
      />

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
