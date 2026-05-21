import { AlertTriangle } from 'lucide-react'
import { getTriageDashboardData } from '../queries'
import { TriageDashboardClient } from './TriageDashboardClient'

export async function TriageDashboardContainer() {
  const result = await getTriageDashboardData()

  if (!result.success || !result.data) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/20 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-semibold mb-2">Failed to load triage beds</p>
        <p className="text-muted-foreground text-sm">{result.error}</p>
      </div>
    )
  }

  return <TriageDashboardClient initialBeds={result.data.beds} />
}
