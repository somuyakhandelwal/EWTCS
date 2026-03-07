// Bed Filter Bar Component
// US-1.4: Filter and Sort Delayed Beds

import { memo, useState, useRef, useEffect } from 'react'
import { Filter, ArrowDownWideNarrow, X, Search, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { SortOrder } from '../hooks/useBedFilter'

interface BedFilterBarProps {
  searchQuery: string
  showDelayedOnly: boolean
  sortOrder: SortOrder
  delayedCount: number
  isFilterActive: boolean
  onSearchChange: (value: string) => void
  onToggleFilter: () => void
  onToggleSortOrder: () => void
  onClear: () => void
}

/**
 * Filter and sort controls for the bed dashboard.
 * Unified search, filter, and sort into a single bar.
 */
export const BedFilterBar = memo(function BedFilterBar({
  searchQuery,
  showDelayedOnly,
  sortOrder,
  delayedCount,
  isFilterActive,
  onSearchChange,
  onToggleFilter,
  onToggleSortOrder,
  onClear,
}: BedFilterBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeFilterCount = (showDelayedOnly ? 1 : 0) + (sortOrder !== 'none' ? 1 : 0)

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
      {/* Search Section */}
      <div className="relative flex-1 max-w-sm group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Quick search bed..."
          aria-label="Search beds by number or status"
          className="w-full pl-9 pr-9 py-1.5 bg-card/50 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
            title="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter & Sort Dropdown Section */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            'h-9 rounded-lg border-border bg-card transition-all font-medium gap-2',
            isFilterActive && 'border-primary/50 bg-primary/5'
          )}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Filter & Sort</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] bg-primary text-primary-foreground rounded-full font-bold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
        </Button>

        {isFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-9 px-2 hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Clear all"
          >
            <X className="h-4 w-4 mr-1" />
            <span className="text-xs font-semibold">Clear</span>
          </Button>
        )}

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1 tracking-wider">Filters</p>
                <button
                  onClick={onToggleFilter}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
                    showDelayedOnly ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Delayed Only</span>
                    {delayedCount > 0 && (
                      <span className="text-[10px] px-1.5 bg-status-delayed/20 text-status-delayed rounded-full font-bold">
                        {delayedCount}
                      </span>
                    )}
                  </div>
                  {showDelayedOnly && <Check className="h-3.5 w-3.5" />}
                </button>

                <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1 mt-2 tracking-wider">Sorting</p>
                <button
                  onClick={onToggleSortOrder}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
                    sortOrder === 'desc' ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                    <span>Longest Delay First</span>
                  </div>
                  {sortOrder === 'desc' && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>

              {isFilterActive && (
                <div className="border-t border-border p-1 bg-muted/30">
                  <button
                    onClick={() => {
                      onClear()
                      setIsDropdownOpen(false)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors font-medium"
                  >
                    Reset All
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
