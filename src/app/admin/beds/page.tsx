import { verifyActiveSession } from '@/shared/lib/active-session'
import { redirect } from 'next/navigation'
import { getAllBeds, getWardsList } from '@/features/bed-management/actions/bed-queries-actions'
import { BedManagementClient } from '@/features/bed-management/components/BedManagementClient'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import type { BedManagementData } from '@/features/bed-management/types/bed-management.types'

interface Ward {
    id: string
    name: string
}

export default async function BedManagementPage() {
    // Verify admin access
    const session = await verifyActiveSession()
    if (!session || session.role !== 'admin') {
        redirect('/api/auth/force-logout')
    }

    // Fetch beds and wards
    const [bedsResult, wardsResult] = await Promise.all([
        getAllBeds(true), // Include inactive beds
        getWardsList(),
    ])

    // Handle errors
    if (!bedsResult.success || !wardsResult.success) {
        return (
            <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="mb-6">
                        <Link href="/admin">
                            <Button variant="outline">← Back to Admin</Button>
                        </Link>
                    </div>

                    <div className="rounded-lg border border-red-800 bg-red-900/20 p-8 text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-300 font-semibold mb-2">
                            Failed to load bed management data
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {bedsResult.error || wardsResult.error}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link href="/admin">
                        <Button variant="outline">← Back to Admin</Button>
                    </Link>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                            Logged in as <span className="text-foreground">{session.username}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Administrator</p>
                    </div>
                </div>

                {/* Main Content */}
                <BedManagementClient
                    initialBeds={bedsResult.data as BedManagementData[]}
                    wards={wardsResult.data as Ward[]}
                />
            </div>
        </div>
    )
}
