'use client'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Search } from 'lucide-react'
import type { CorrectionAuditFilters } from '../types/corrections'

interface Props {
    filters: CorrectionAuditFilters
    setFilters: (update: (f: CorrectionAuditFilters) => CorrectionAuditFilters) => void
    handleSearch: () => void
    loading: boolean
}

export function CorrectionAuditTrailFilters({ filters, setFilters, handleSearch, loading }: Props) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Bed Number</Label>
                <Input
                    placeholder="e.g. ER-01"
                    value={filters.bedNumber || ''}
                    onChange={e => setFilters(f => ({ ...f, bedNumber: e.target.value }))}
                    className="bg-zinc-950 border-zinc-700 h-9"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Correction Reason</Label>
                <Input
                    placeholder="Search reason..."
                    value={filters.reason || ''}
                    onChange={e => setFilters(f => ({ ...f, reason: e.target.value }))}
                    className="bg-zinc-950 border-zinc-700 h-9"
                />
            </div>
            <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-500 text-white gap-2 h-9"
            >
                <Search className="h-4 w-4" />
                Search
            </Button>
        </div>
    )
}
