/**
 * SLA status display component
 * Shows SLA tracking and breached items
 * EPIC 17: Security & Privacy
 */

'use client'

import type { SLATrackingSummary, VulnerabilitySLA } from '../types/scan'
import { formatSLADeadline } from '../lib/sla-tracker'

interface SLAStatusCardProps {
  summary: SLATrackingSummary
  breachedItems: VulnerabilitySLA[]
}

export function SLAStatusCard({ summary, breachedItems }: SLAStatusCardProps) {
  const hasBreaches = summary.breachedCount > 0
  const breachColor = hasBreaches ? 'text-red-600' : 'text-green-600'
  const breachBg = hasBreaches ? 'bg-red-50' : 'bg-green-50'

  return (
    <div className={`rounded-lg border ${breachBg} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">SLA Status</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${breachColor}`}>
          {hasBreaches ? `🔴 ${summary.breachedCount} Breached` : '✅ All On Track'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-2xl font-bold text-blue-600">{summary.openCount}</div>
          <div className="text-xs text-gray-600 uppercase">Open</div>
        </div>
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-2xl font-bold text-amber-600">{summary.breachedCount}</div>
          <div className="text-xs text-gray-600 uppercase">Breached</div>
        </div>
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-2xl font-bold text-green-600">{summary.fixedCount}</div>
          <div className="text-xs text-gray-600 uppercase">Fixed</div>
        </div>
      </div>

      {hasBreaches && (
        <div className="mt-4 border-t pt-4">
          <h4 className="font-semibold text-red-600 mb-3">⚠️ Breached Items</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {breachedItems.slice(0, 5).map(item => (
              <div key={item.vulnerabilityId} className="text-sm p-2 bg-white rounded border-l-4 border-red-600">
                <div className="font-medium uppercase">{item.severity}</div>
                <div className="text-gray-600 text-xs">{item.vulnerabilityId}</div>
                <div className="text-red-600 font-semibold">{formatSLADeadline(item.slaDeadline)}</div>
              </div>
            ))}
            {breachedItems.length > 5 && (
              <div className="text-sm text-gray-600 italic">
                +{breachedItems.length - 5} more breached items
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
