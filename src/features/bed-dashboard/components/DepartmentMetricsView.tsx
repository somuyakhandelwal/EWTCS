'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { getDepartmentMetrics } from '@/features/bed-dashboard/actions/department-metrics'
import { Loader2 } from 'lucide-react'
import type {
  DepartmentMetrics,
  WorkflowAreaMetrics,
} from '@/features/bed-dashboard/types/department-metrics'

function formatCycleMinutes(minutes: number, cycleCount: number): string {
  if (cycleCount === 0) {
    return 'No completed cycles yet'
  }

  return `${minutes} mins`
}

function WorkflowMetricsCard({
  title,
  occupancyLabel,
  tatLabel,
  cleaningLabel,
  metrics,
  className,
  titleClassName,
}: {
  title: string
  occupancyLabel: string
  tatLabel: string
  cleaningLabel: string
  metrics: WorkflowAreaMetrics
  className: string
  titleClassName: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className={titleClassName}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{occupancyLabel}</span>
            <span className="font-semibold text-foreground">
              {metrics.occupiedBeds} / {metrics.totalBeds}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{tatLabel}</span>
            <span className="text-right font-semibold text-foreground">
              {formatCycleMinutes(metrics.averageTatMinutes, metrics.tatCycleCount)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{cleaningLabel}</span>
            <span className="text-right font-semibold text-foreground">
              {formatCycleMinutes(metrics.averageCleaningMinutes, metrics.cleaningCycleCount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DepartmentMetricsView() {
  const [metrics, setMetrics] = useState<DepartmentMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await getDepartmentMetrics()
        if (res.success && res.data) {
          setMetrics(res.data)
          setError(null)
        } else {
          setError(res.error ?? 'Unable to load department metrics')
        }
      } catch {
        // Catches network-level "Failed to fetch" from the server action transport
        setError('Unable to reach server. Metrics will retry shortly.')
      } finally {
        setLoading(false)
      }
    }
    loadMetrics()
    // Poll every 30s for real-time visibility
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <Card className="mb-6 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-900 dark:text-amber-200">
            Department metrics unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 dark:text-amber-300">
          {error ?? 'Unable to load consolidated metrics. Retrying automatically every 30 seconds.'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div
      className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      data-help-id="consolidated-metrics"
    >
      <WorkflowMetricsCard
        title="Triage Area"
        occupancyLabel="Bed occupancy:"
        tatLabel="Whole triage TAT:"
        cleaningLabel="Triage cleaning TAT:"
        metrics={metrics.triage}
        className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:border-blue-800 dark:from-blue-950 dark:to-cyan-950"
        titleClassName="text-lg text-blue-800 dark:text-blue-300"
      />

      <WorkflowMetricsCard
        title="Emergency Ward"
        occupancyLabel="Bed occupancy:"
        tatLabel="Whole ER TAT:"
        cleaningLabel="ER cleaning TAT:"
        metrics={metrics.emergency}
        className="border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 dark:border-rose-800 dark:from-rose-950 dark:to-orange-950"
        titleClassName="text-lg text-rose-800 dark:text-rose-300"
      />

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-green-800 dark:text-green-300">OT Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">In Progress:</span>
              <span className="font-semibold text-foreground">{metrics.ot.inProgress}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-semibold text-foreground">{metrics.ot.completed}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Utilization Rate:</span>
              <span className="font-semibold text-foreground">{metrics.ot.utilizationRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950 dark:to-fuchsia-950 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-purple-800 dark:text-purple-300">Cath Lab Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Active Procedures:</span>
              <span className="font-semibold text-foreground">{metrics.cathLab.activeProcedures}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">CAG Count:</span>
              <span className="font-semibold text-foreground">{metrics.cathLab.cagCount}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">PTCA Count:</span>
              <span className="font-semibold text-foreground">{metrics.cathLab.ptcaCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

