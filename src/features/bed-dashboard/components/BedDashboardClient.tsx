// Bed Dashboard Client Wrapper
// Epic 1: Nurse Desk Bed Dashboard
// This component wraps the BedGrid to handle client-side interactions

'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BedGrid } from './BedGrid'
import type { BedGridData, BedWithElapsedTime } from '../types/bed'

interface BedDashboardClientProps {
  initialData: BedGridData
}

export function BedDashboardClient({ initialData }: BedDashboardClientProps) {
  const router = useRouter()

  const handleRefresh = useCallback(() => {
    // Use Next.js router to refresh server components
    router.refresh()
  }, [router])

  const handleBedClick = useCallback((bed: BedWithElapsedTime) => {
    // TODO US-1.2: Open bed details modal or navigate to bed page
    // Future: router.push(`/dashboard/beds/${bed.id}`)
    void bed
  }, [])

  return (
    <BedGrid
      data={initialData}
      onRefresh={handleRefresh}
      onBedClick={handleBedClick}
    />
  )
}
