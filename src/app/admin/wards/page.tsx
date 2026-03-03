import { verifyActiveSession } from '@/shared/lib/active-session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { Tooltip } from '@/shared/components/ui/tooltip'
import { AlertTriangle } from 'lucide-react'
import { getAllWards } from '@/features/ward-management/actions/ward-actions'
import { WardTable } from '@/features/ward-management/components/WardTable'
import { AddWardDialog } from '@/features/ward-management/components/AddWardDialog'

export const dynamic = 'force-dynamic'

export default async function WardManagementPage() {
    const session = await verifyActiveSession()
    if (!session || session.role !== 'admin') {
        redirect('/api/auth/force-logout')
    }

    const wardsResult = await getAllWards()

    if (!wardsResult.success) {
        return (
            <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="mb-6">
                        <Tooltip content="Return to admin overview" side="bottom">
                            <Link href="/admin">
                                <Button variant="outline">← Back to Admin</Button>
                            </Link>
                        </Tooltip>
                    </div>

                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-8 text-center">
                        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <p className="text-destructive font-semibold mb-2">
                            Failed to load wards data
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {wardsResult.error}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const wards = wardsResult.data || []

    return (
        <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between" data-help-id="admin-wards-header">
                    <Tooltip content="Return to admin overview" side="bottom">
                        <Link href="/admin">
                            <Button variant="outline">← Back to Admin</Button>
                        </Link>
                    </Tooltip>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                            Logged in as <span className="text-foreground">{session.username}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Administrator</p>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Ward Management</h2>
                        <p className="text-muted-foreground">
                            Add and track hospital wards in the system
                        </p>
                    </div>
                    <AddWardDialog />
                </div>

                <div data-help-id="admin-wards-table">
                    <WardTable wards={wards} />
                </div>
            </div>
        </div>
    )
}
