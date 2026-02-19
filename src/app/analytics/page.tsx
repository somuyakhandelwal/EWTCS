import { StageAnalyticsView } from '@/features/bed-dashboard/components/StageAnalyticsView'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { redirect } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const session = await verifyActiveSession()

  if (!session) {
    redirect('/login')
  }

  // Only supervisor and admin can view analytics
  if (session.role !== 'supervisor' && session.role !== 'admin') {
    redirect('/dashboard')
  }

  // Back destination depends on role: supervisors came from /supervisor
  const backHref = session.role === 'supervisor' ? '/supervisor' : '/dashboard'

  return (
    <div className="min-h-screen bg-black text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Emergency Ward Analytics
            </h1>
            <p className="text-zinc-400">Analyze patient flow through treatment stages</p>
          </div>
        </div>

        {/* Analytics View */}
        <StageAnalyticsView />
      </div>
    </div>
  )
}