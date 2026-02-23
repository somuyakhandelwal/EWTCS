import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { AuditLogRecord } from '@/shared/lib/audit'

interface AdminRecentActivityProps {
  recentLogs: AuditLogRecord[]
}

/** Renders the "Recent Activity" audit-log card on the admin dashboard. */
export function AdminRecentActivity({ recentLogs }: AdminRecentActivityProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-xl text-white">Recent Activity</CardTitle>
        <p className="text-sm text-zinc-400 mt-1">Latest user management actions</p>
      </CardHeader>
      <CardContent>
        {recentLogs.length > 0 ? (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${log.action_type === 'CREATE'
                        ? 'bg-green-500'
                        : log.action_type === 'UPDATE'
                          ? 'bg-blue-500'
                          : log.action_type === 'DEACTIVATE'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                      }`}
                  />
                  <div>
                    <p className="text-sm text-white">
                      <span className="font-medium">
                        {log.performed_by_username || 'System'}
                      </span>{' '}
                      {log.action_type.toLowerCase()}d{' '}
                      <span className="font-medium">
                        {log.target_username || 'entity'}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(log.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-zinc-500 uppercase">{log.action_type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-8">No recent activity</p>
        )}
      </CardContent>
    </Card>
  )
}
