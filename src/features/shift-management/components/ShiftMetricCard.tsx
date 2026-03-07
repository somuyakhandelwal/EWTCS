// ShiftMetricCard — Reusable metric display card for ShiftReportView (US-8.3)
// Epic 8: Shift Management

import { Card, CardContent, CardHeader, CardDescription } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

interface ShiftMetricCardProps {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  accent?: string
}

export function ShiftMetricCard({ icon, label, value, sub, accent }: ShiftMetricCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold', accent ?? 'text-foreground')}>
          {value}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
