// BedGridFooter — summary line showing filtered/total bed count
// Extracted from BedGrid to keep that file under the 200-line limit

import type { SortOrder } from '../hooks/useBedFilter'

interface BedGridFooterProps {
  displayedCount: number
  totalCount: number
  showDelayedOnly: boolean
  sortOrder: SortOrder
}

export function BedGridFooter({ displayedCount, totalCount, showDelayedOnly, sortOrder }: BedGridFooterProps) {
  return (
    <div className="text-center text-xs text-zinc-500">
      Showing {displayedCount} of {totalCount} beds
      {showDelayedOnly && ' · delayed only'}
      {sortOrder === 'desc' && ' · sorted by delay'}
    </div>
  )
}
