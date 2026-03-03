import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import type { LowUsageUser } from '@/features/adoption/types'

interface LowUsageAlertProps {
    users: LowUsageUser[]
    thresholdDays?: number
}

const ROLE_LABELS: Record<string, string> = {
    nurse: 'Nurse',
    housekeeping: 'Housekeeping',
    supervisor: 'Supervisor',
    admin: 'Admin',
    auditor: 'Auditor',
}

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    nurse: 'default',
    housekeeping: 'secondary',
    supervisor: 'outline',
    admin: 'destructive',
    auditor: 'secondary',
}

function formatLastLogin(lastLogin: string | null, days: number | null): string {
    if (!lastLogin) return 'Never logged in'
    if (days == null) return 'Unknown'
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
}

export function LowUsageAlert({ users, thresholdDays = 7 }: LowUsageAlertProps) {
    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <CardTitle className="text-lg text-foreground">Low-Usage Alert</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    Active users who have not logged in for{' '}
                    <span className="font-medium text-foreground">{thresholdDays}+ days</span>.
                    Users who have <span className="font-medium text-foreground">never logged in</span> through
                    the UI (e.g. newly created accounts) will always appear here.
                </p>
            </CardHeader>
            <CardContent>
                {users.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 py-2">
                        <span>✓</span>
                        <span>All active users have logged in within the last {thresholdDays} days.</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {users.map((user) => (
                            <div
                                key={user.userId}
                                className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3 p-3 rounded-lg bg-background border border-border"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-yellow-400" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{user.username}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Last login: {formatLastLogin(user.lastLogin, user.daysSinceLogin)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={ROLE_VARIANT[user.role] ?? 'outline'}>
                                        {ROLE_LABELS[user.role] ?? user.role}
                                    </Badge>
                                    {user.daysSinceLogin == null && (
                                        <Badge variant="destructive">Never</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
