// Admin: Shift Schedules Page (US-8.1)
// Epic 8: Shift Management

import { getAllShifts } from '@/features/shift-management/lib/shift-queries'
import { ShiftList } from '@/features/shift-management/components/ShiftList'

// Force dynamic rendering — prevents build-time DB connection errors
export const dynamic = 'force-dynamic'

export default async function ShiftsPage() {
  const shifts = await getAllShifts()

  return (
    <div className='p-6 max-w-2xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold'>Shift Schedules</h1>
        <p className='text-gray-500 text-sm mt-1'>
          Configure Morning, Evening, and Night shifts. Default shifts cannot be deleted.
          Shifts can overlap for transition periods. Each bed status update is automatically
          tagged with the active shift.
        </p>
      </div>
      <ShiftList initialShifts={shifts} />
    </div>
  )
}
