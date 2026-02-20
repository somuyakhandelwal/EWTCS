'use client'

// Stage Analytics Header Component
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { Button } from '@/shared/components/ui/button'
import { Download } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface StageAnalyticsHeaderProps {
  title?: string
  description?: string
  onExportCSV?: () => Promise<void>
  exporting?: boolean
  readOnly?: boolean
  className?: string
}

export function StageAnalyticsHeader({
  title = 'Stage Analytics',
  description = 'Analyze patient flow through emergency ward stages',
  onExportCSV,
  exporting = false,
  readOnly = false,
  className,
}: StageAnalyticsHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h2 className="text-2xl font-bold trackingl-tight">{title}</h2>
        <p className="text-sm text-zinc-600 mt-1">{description}</p>
      </div>
      {onExportCSV && (
        <Button onClick={onExportCSV} disabled={exporting || readOnly} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      )}
    </div>
  )
}
