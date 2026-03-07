// Example usage of StageAnalyticsView
// This file demonstrates how to integrate the analytics dashboard into your application
// 
// File location: src/app/analytics/page.tsx (example)
// Or any other page where you want to display analytics

'use client'

import { StageAnalyticsView } from '@/features/bed-dashboard/components/StageAnalyticsView'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function AnalyticsDashboardPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Emergency Ward Analytics</h1>
                <p className="text-sm text-zinc-600 mt-1">
                  Analyze patient flow and stage transition metrics
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StageAnalyticsView
          title="Stage Analytics Report"
          className="space-y-6"
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <p>Emergency Ward Time Tracking System</p>
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// Alternative: Simple Analytics View
// ============================================================================
// 
// If you want a minimal analytics page, use:

/*
export default function SimpleAnalyticsPage() {
  return (
    <div className="p-8">
      <StageAnalyticsView />
    </div>
  )
}
*/

// ============================================================================
// Alternative: Analytics with Custom Styling
// ============================================================================
//
// If you want to customize the appearance:

/*
export default function CustomAnalyticsPage() {
  return (
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-800 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Analytics Dashboard</h1>
        <StageAnalyticsView
          title="Patient Flow Analysis"
          className="space-y-8"
        />
      </div>
    </div>
  )
}
*/

// ============================================================================
// Integration Points
// ============================================================================
//
// 1. Add route to your navigation:
//    In src/app/layout.tsx or in your navigation component:
//    
//    <Link href="/analytics">Analytics</Link>