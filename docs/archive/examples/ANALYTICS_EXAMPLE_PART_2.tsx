//
// 2. Add to your navigation menu:
//    - For supervisors: Show analytics link
//    - For admins: Show analytics link
//    - For nurses: Hide or show read-only version
//
// 3. Database Migrations:
//    - Run migration 1700000009000_optimize_stage_analytics.sql
//
// 4. Environment Setup:
//    - No additional environment variables needed
//    - Uses existing database connection

// ============================================================================
// Role-Based Access
// ============================================================================
//
// The analytics component requires supervisor or admin role
// Automatic protection is built into the server actions
//
// To add role-based route protection, wrap the page:

/*
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { requireRole } from '@/shared/lib/auth'

export default function AnalyticsDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        await requireRole(['supervisor', 'admin'])
      } catch {
        router.push('/dashboard')
      }
    }
    void checkAccess()
  }, [router])

  return <StageAnalyticsView />
}
*/

// ============================================================================
// Refresh Data Periodically
// ============================================================================
//
// If you want real-time updates, add a refresh interval:

/*
'use client'

import { useState, useEffect } from 'react'
import { StageAnalyticsView } from '@/features/bed-dashboard/components/StageAnalyticsView'

export default function AnalyticsDashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1)
    }, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div key={refreshKey}>
      <StageAnalyticsView />
    </div>
  )
}
*/

// ============================================================================
// Export Analytics Data
// ============================================================================
//
// Users can export CSV data directly from the UI via the "Export CSV" button
// The exported file contains:
// - ID, Bed Number, From Stage, To Stage
// - Transition Time, Duration in Previous Stage, Duration in Current Stage
// - Changed By User, Notes

// ============================================================================
// Analytics Data Flow
// ============================================================================
//
// 1. User visits /analytics page
// 2. StageAnalyticsView component loads
// 3. Component calls fetchStageDurationStats server action
// 4. Server action:
//    - Verifies user role (supervisor/admin)
//    - Queries stage_duration_statistics materialized view
//    - Returns data to component
// 5. Component renders:
//    - Summary cards with key metrics
//    - Stage duration analysis table
//    - Longest waiting beds list
//    - Bed timeline when selected
// 6. User can:
//    - Filter by date range (via fetchStageTransitions)
//    - Click on beds to view timeline
//    - Export data to CSV
// 7. Exported CSV:
//    - Contains all transition records
//    - Can be opened in Excel/Sheets
//    - Ready for external analysis
