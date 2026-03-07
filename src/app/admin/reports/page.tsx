// Management Report Dashboard Page
// EPIC 10: US-10.1 – US-10.7
// Route: /admin/reports

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, ChevronLeft } from 'lucide-react'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { getReportDataAction } from '@/features/reports/actions/report-actions'
import { getSignOffAction } from '@/features/reports/actions/sign-off-actions'
import { ReportsDashboard } from '@/features/reports/components/ReportsDashboard'
import type { SignOff } from '@/features/reports/lib/sign-off-queries'

/** Default: last 30 days */
function defaultFilter() {
  const end   = new Date()
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - 30)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  }
}

export default async function AdminReportsPage() {
  const session = await verifyActiveSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'supervisor') redirect('/dashboard')

  const filter       = defaultFilter()
  const canSignOff   = session.role === 'admin' || session.role === 'supervisor'

  const [reportResult, signOffResult] = await Promise.all([
    getReportDataAction(filter),
    canSignOff ? getSignOffAction(filter.endDate) : Promise.resolve({ success: true }),
  ])

  if (!reportResult.success || !reportResult.data) {
    return (
      <div className="min-h-screen bg-black text-foreground p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-red-400">{reportResult.error ?? 'Failed to load report'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-foreground p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BarChart2 className="h-6 w-6 text-violet-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Management Reports</h1>
              <p className="text-zinc-400 text-sm">
                ED performance overview · {filter.startDate} → {filter.endDate}
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Admin
          </Link>
        </div>

        <ReportsDashboard
            initialData={reportResult.data}
            initialFilter={filter}
            initialSignOff={(signOffResult as { success: boolean; signOff?: SignOff })?.signOff ?? null}
            canSignOff={canSignOff}
          />
      </div>
    </div>
  )
}
