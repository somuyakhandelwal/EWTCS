// Supervisor Page Client Shell
// US-6.5: owns modal open/close state and wires AddTemporaryBedModal +
//   removeTemporaryBed action to SupervisorBedOverview.
// Lives in app/supervisor/ (app layer) so it may import from multiple features.

'use client'

import { useState, useTransition, useCallback } from 'react'
import { SupervisorBedOverview } from '@/features/bed-dashboard/components/SupervisorBedOverview'
import { AddTemporaryBedModal } from '@/features/bed-management/components/AddTemporaryBedModal'
import { removeTemporaryBed } from '@/features/bed-management/actions/temporary-bed-actions'
import { getBedGridData } from '@/features/bed-dashboard/actions/bed-grid-actions'
import type { BedGridData } from '@/features/bed-dashboard/types/bed'

interface SupervisorClientShellProps {
    initialData: BedGridData
}

export function SupervisorClientShell({ initialData }: SupervisorClientShellProps) {
    const [modalOpen, setModalOpen] = useState(false)
    const [removingId, setRemovingId] = useState<string | null>(null)
    // BUG FIX #6: shell owns the refreshed data so UI updates immediately after remove/create
    const [data, setData] = useState<BedGridData>(initialData)
    const [, startTransition] = useTransition()

    /** Re-fetch grid data and push it into the overview. */
    const refreshData = useCallback(async () => {
        const result = await getBedGridData()
        if (result.success && result.data) {
            startTransition(() => setData(result.data!))
        }
    }, [])

    async function handleRemoveTempBed(bedId: string) {
        setRemovingId(bedId)
        const formData = new FormData()
        formData.append('bedId', bedId)
        startTransition(async () => {
            await removeTemporaryBed(formData)
            setRemovingId(null)
            // BUG FIX #6: refresh so the removed bed disappears without a manual reload
            await refreshData()
        })
    }

    return (
        <>
            <SupervisorBedOverview
                initialData={data}
                onAddTempBed={() => setModalOpen(true)}
                onRemoveTempBed={handleRemoveTempBed}
                isRemovingId={removingId}
            />
            <AddTemporaryBedModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={async () => {
                    setModalOpen(false)
                    // BUG FIX #6: also refresh after creation
                    await refreshData()
                }}
            />
        </>
    )
}
