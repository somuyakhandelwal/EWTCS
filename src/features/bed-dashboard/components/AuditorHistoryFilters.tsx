'use client'

/**
 * EPIC 7 / Auditor History — Filter bar sub-component.
 * Extracted from AuditorHistoryView to keep each file under 200 lines.
 */

import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { DEFAULT_AUDITOR_HISTORY_FILTERS } from './auditor-history-view.utils'

export type AuditorHistoryFilterState = typeof DEFAULT_AUDITOR_HISTORY_FILTERS

interface AuditorHistoryFiltersProps {
  filters: AuditorHistoryFilterState
  onChange: (filters: AuditorHistoryFilterState) => void
  onApply: () => void
  onClear: () => void
}

export function AuditorHistoryFilters({
  filters,
  onChange,
  onApply,
  onClear,
}: AuditorHistoryFiltersProps) {
  const set = (key: keyof AuditorHistoryFilterState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder="Filter bed number"  value={filters.bedNumber}        onChange={set('bedNumber')} />
        <Input placeholder="Filter stage name"  value={filters.stageName}        onChange={set('stageName')} />
        <Input placeholder="Filter user ID"     value={filters.changedByUserId}  onChange={set('changedByUserId')} />
        <Input placeholder="Filter username"    value={filters.changedByUsername} onChange={set('changedByUsername')} />
        <Input type="datetime-local"            value={filters.startDate}        onChange={set('startDate')} />
        <Input type="datetime-local"            value={filters.endDate}          onChange={set('endDate')} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApply}>Apply Filters</Button>
        <Button size="sm" variant="outline" onClick={onClear}>Clear</Button>
      </div>
    </div>
  )
}
