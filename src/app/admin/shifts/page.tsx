// Admin: Shift Schedules Page (US-8.1)
// Epic 8: Shift Management

import { getAllShifts } from '@/features/shift-management/lib/shift-queries'
import { ShiftList } from '@/features/shift-management/components/ShiftList'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { Tooltip } from '@/shared/components/ui/tooltip'

// Force dynamic rendering — prevents build-time DB connection errors
export const dynamic = 'force-dynamic'

export default async function ShiftsPage() {
  const shifts = await getAllShifts()

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Tooltip content="Return to admin overview" side="bottom">
            <Link href="/admin">
              <Button variant="outline">← Back to Admin</Button>
            </Link>
          </Tooltip>
        </div>
        <div className="mb-6" data-help-id="admin-shifts-header">
          <h1 className="text-2xl font-bold text-foreground">Shift Schedules</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure Morning, Evening, and Night shifts. Default shifts cannot be deleted.
            Shifts can overlap for transition periods. Each bed status update is automatically
            tagged with the active shift.
          </p>
        </div>
        <div data-help-id="admin-shifts-list">
          <ShiftList initialShifts={shifts} />
        </div>
      </div>
    </div>
  )
}
