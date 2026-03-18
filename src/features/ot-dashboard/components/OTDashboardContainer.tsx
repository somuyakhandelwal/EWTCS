// OT Dashboard Container Component
// EPIC 23: Operation Theatre (OT) Tracking Module (US-23.1)

import { AlertTriangle } from 'lucide-react'
import { getOTRooms } from '../actions/ot-actions'
import { OTDashboardClient } from './OTDashboardClient'

export async function OTDashboardContainer() {
  const result = await getOTRooms()

  if (!result.success || !result.data) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/20 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-semibold mb-2">Failed to load OT rooms</p>
        <p className="text-muted-foreground text-sm">{result.error}</p>
      </div>
    )
  }

  return <OTDashboardClient initialData={result.data} />
}