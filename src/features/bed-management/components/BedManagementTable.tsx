'use client'

import { useMemo, useState } from 'react'
import type { BedManagementData } from '../types/bed-management.types'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { BedStatisticsBar } from './BedStatisticsBar'
import { Edit, Power, Search } from 'lucide-react'

interface BedManagementTableProps {
    beds: BedManagementData[]
    onEdit: (bed: BedManagementData) => void
    onDeactivate: (bed: BedManagementData) => void
    onReactivate: (bed: BedManagementData) => void
}

export function BedManagementTable({
    beds,
    onEdit,
    onDeactivate,
    onReactivate,
}: BedManagementTableProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [showInactive, setShowInactive] = useState(false)

    // Filter and search beds
    const filteredBeds = useMemo(() => {
        return beds.filter((bed) => {
            // Filter by active status
            if (!showInactive && !bed.isActive) return false

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                return (
                    bed.bedNumber.toLowerCase().includes(term) ||
                    bed.wardName?.toLowerCase().includes(term) ||
                    bed.location?.toLowerCase().includes(term)
                )
            }

            return true
        })
    }, [beds, searchTerm, showInactive])

    const activeCount = beds.filter((b) => b.isActive).length
    const inactiveCount = beds.filter((b) => !b.isActive).length

    return (
        <div className="space-y-4">
            {/* Filters and Search */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search beds..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Button
                    variant={showInactive ? 'default' : 'outline'}
                    onClick={() => setShowInactive(!showInactive)}
                >
                    {showInactive ? 'Show Active Only' : 'Show All'}
                </Button>
            </div>
            {/* Statistics */}
            <BedStatisticsBar
                activeCount={activeCount}
                inactiveCount={inactiveCount}
                showingCount={filteredBeds.length}
            />

            {/* Table */}
            <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-card border-b border-border">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-card-foreground">
                                    Bed Number
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-card-foreground">
                                    Ward
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-card-foreground">
                                    Location
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-card-foreground">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-card-foreground">
                                    Current Stage
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-card-foreground">
                                    Occupied
                                </th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-card-foreground">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {filteredBeds.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        No beds found
                                    </td>
                                </tr>
                            ) : (
                                filteredBeds.map((bed) => (
                                    <tr
                                        key={bed.id}
                                        className="hover:bg-card transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {bed.bedNumber}
                                        </td>
                                        <td className="px-4 py-3 text-card-foreground">
                                            {bed.wardName || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-sm">
                                            {bed.location || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={bed.isActive ? 'default' : 'outline'}
                                                className={
                                                    bed.isActive
                                                        ? 'bg-green-900/50 text-green-400 border-green-800'
                                                        : 'bg-red-900/50 text-red-400 border-red-800'
                                                }
                                            >
                                                {bed.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-card-foreground text-sm">
                                            {bed.currentStageName || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    bed.isOccupied
                                                        ? 'bg-orange-900/50 text-orange-400 border-orange-800'
                                                        : 'bg-card text-muted-foreground border-border'
                                                }
                                            >
                                                {bed.isOccupied ? 'Occupied' : 'Available'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onEdit(bed)}
                                                    disabled={!bed.isActive}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {bed.isActive ? (
                                                    <button
                                                        onClick={() => onDeactivate(bed)}
                                                        disabled={bed.isOccupied}
                                                        title="Deactivate bed"
                                                        className="px-2 py-0.5 text-xs font-medium rounded border border-red-700 text-red-400 hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onReactivate(bed)}
                                                        className="text-green-400 hover:text-green-300"
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div >
        </div >
    )
}
