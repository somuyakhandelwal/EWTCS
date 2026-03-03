'use client'

import { Button } from '@/shared/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { BedFilterBar } from './BedFilterBar'
import type { SortOrder } from '../hooks/useBedFilter'

interface BedGridHeaderProps {
  searchQuery: string
  showDelayedOnly: boolean
  sortOrder: SortOrder
  delayedCount: number
  isFilterActive: boolean
  isRefreshing: boolean
  onSearchChange: (value: string) => void
  onToggleFilter: () => void
  onToggleSortOrder: () => void
  onClearFilter: () => void
  onRefresh?: () => void
}

export function BedGridHeader({
  searchQuery,
  showDelayedOnly,
  sortOrder,
  delayedCount,
  isFilterActive,
  isRefreshing,
  onSearchChange,
  onToggleFilter,
  onToggleSortOrder,
  onClearFilter,
  onRefresh,
}: BedGridHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Unified Filter bar — Search, Delayed Only, Sort by Delay */}
        <BedFilterBar
          searchQuery={searchQuery}
          showDelayedOnly={showDelayedOnly}
          sortOrder={sortOrder}
          delayedCount={delayedCount}
          isFilterActive={isFilterActive}
          onSearchChange={onSearchChange}
          onToggleFilter={onToggleFilter}
          onToggleSortOrder={onToggleSortOrder}
          onClear={onClearFilter}
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="self-end md:self-auto text-muted-foreground hover:text-foreground h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  )
}
