import { getBedGridData } from "@/features/bed-dashboard/actions/bed-grid-actions"
import { createVirtualBed } from "@/features/bed-management/actions/virtual-bed-actions"
import { BedDashboardClient } from "./BedDashboardClient"
import { AlertTriangle } from "lucide-react"

interface Props {
    role: string
    isKiosk: boolean
}

export async function BedDashboardContainer({ role }: Props) {
    const bedGridResult = await getBedGridData()

    if (!bedGridResult.success || !bedGridResult.data) {
        return (
            <div className="rounded-lg border border-destructive bg-destructive/20 p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive font-semibold mb-2">Failed to load bed data</p>
                <p className="text-muted-foreground text-sm">{bedGridResult.error}</p>
            </div>
        )
    }

    return (
        <BedDashboardClient
            initialData={bedGridResult.data}
            canRecordDispositionReasons={role !== 'housekeeping'}
            onCreateVirtualBed={createVirtualBed}
        />
    )
}
