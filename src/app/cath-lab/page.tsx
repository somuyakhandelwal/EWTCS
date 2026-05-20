import { redirect } from 'next/navigation'
import { Activity } from 'lucide-react'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import {
  getActiveCardiologistsAction,
  getRecentCathLabProceduresAction,
} from '@/features/cath-lab/actions/cath-lab-actions'
import { CathLabProcedureForm } from '@/features/cath-lab/components/CathLabProcedureForm'
import { CathLabProcedureList } from '@/features/cath-lab/components/CathLabProcedureList'

const CATH_LAB_ALLOWED_ROLES = ['cardiologist', 'cath_lab_nurse', 'nurse', 'supervisor', 'admin']

export const dynamic = 'force-dynamic'

export default async function CathLabPage() {
  const session = await verifyActiveSession()

  if (!session) {
    redirect('/api/auth/force-logout')
  }

  if (!CATH_LAB_ALLOWED_ROLES.includes(session.role)) {
    redirect('/dashboard')
  }

  const [proceduresResult, cardiologistsResult] = await Promise.all([
    getRecentCathLabProceduresAction(50),
    getActiveCardiologistsAction(),
  ])

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/20 border border-red-900/50 rounded-lg">
              <Activity className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cath Lab Procedure Logging</h1>
              <p className="text-sm text-muted-foreground">
                Dedicated cardiology workflow for CAG/PTCA emergency procedure tracking
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          <CathLabProcedureForm
            cardiologists={cardiologistsResult.data ?? []}
            currentUserId={session.userId}
            currentUserRole={session.role}
          />
          <CathLabProcedureList procedures={proceduresResult.data ?? []} />
        </div>
      </div>
    </div>
  )
}
