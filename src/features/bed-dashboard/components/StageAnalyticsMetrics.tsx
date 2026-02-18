'use client'

// Stage Analytics Summary Metrics Component
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { Card, CardContent, CardHeader, CardDescription } from '@/shared/components/ui/card'
import { formatDuration } from '../lib/analytics-utils'

interface SummaryMetrics {
  totalBedsUsed: number
  totalTransitions: number
  averageTimePerPatientMs: number
  averageTransitionsPerPatient: number
  totalPatientsProcessed: number
}

interface StageAnalyticsMetricsProps {
  summary: SummaryMetrics | null
}

export function StageAnalyticsMetrics({ summary }: StageAnalyticsMetricsProps) {
  if (!summary) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Total Beds Used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalBedsUsed}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Total Transitions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalTransitions}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Avg Time per Patient</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">{formatDuration(summary.averageTimePerPatientMs)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Avg Transitions/Patient</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.averageTransitionsPerPatient.toFixed(1)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Patients Processed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalPatientsProcessed}</div>
        </CardContent>
      </Card>
    </div>
  )
}
