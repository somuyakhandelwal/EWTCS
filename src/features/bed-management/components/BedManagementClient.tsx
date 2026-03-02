'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BedManagementTable } from '@/features/bed-management/components/BedManagementTable'
import { AddBedDialog } from '@/features/bed-management/components/AddBedDialog'
import { EditBedDialog } from '@/features/bed-management/components/EditBedDialog'
import { ToggleBedStatusDialog } from '@/features/bed-management/components/ToggleBedStatusDialog'
import type { BedManagementData } from '@/features/bed-management/types/bed-management.types'
import { Loader2 } from 'lucide-react'

interface Ward {
    id: string
    name: string
}

interface BedManagementClientProps {
    initialBeds: BedManagementData[]
    wards: Ward[]
}

export function BedManagementClient({ initialBeds, wards }: BedManagementClientProps) {
    const router = useRouter()
    const [beds, setBeds] = useState(initialBeds)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Dialog states
    const [editingBed, setEditingBed] = useState<BedManagementData | null>(null)
    const [deactivatingBed, setDeactivatingBed] = useState<BedManagementData | null>(null)
    const [reactivatingBed, setReactivatingBed] = useState<BedManagementData | null>(null)

    const handleSuccess = () => {
        setIsRefreshing(true)
        router.refresh()
        // Reset after a delay to show refresh animation
        setTimeout(() => setIsRefreshing(false), 500)
    }

    // Update beds when initialBeds changes (after refresh)
    useEffect(() => {
        setBeds(initialBeds)
    }, [initialBeds])

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Bed Management</h2>
                    <p className="text-muted-foreground">
                        Add, edit, or deactivate beds in the system
                    </p>
                </div>
                <AddBedDialog wards={wards} onSuccess={handleSuccess} />
            </div>

            {/* Loading Overlay */}
            {isRefreshing && (
                <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-lg p-6 flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                        <span className="text-foreground">Refreshing beds...</span>
                    </div>
                </div>
            )}

            {/* Table */}
            <BedManagementTable
                beds={beds}
                onEdit={setEditingBed}
                onDeactivate={setDeactivatingBed}
                onReactivate={setReactivatingBed}
            />

            {/* Edit Dialog */}
            {editingBed && (
                <EditBedDialog
                    bed={editingBed}
                    wards={wards}
                    onClose={() => setEditingBed(null)}
                    onSuccess={handleSuccess}
                />
            )}

            {/* Deactivate Dialog */}
            {deactivatingBed && (
                <ToggleBedStatusDialog
                    bed={deactivatingBed}
                    action="deactivate"
                    onClose={() => setDeactivatingBed(null)}
                    onSuccess={handleSuccess}
                />
            )}

            {/* Reactivate Dialog */}
            {reactivatingBed && (
                <ToggleBedStatusDialog
                    bed={reactivatingBed}
                    action="reactivate"
                    onClose={() => setReactivatingBed(null)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    )
}
