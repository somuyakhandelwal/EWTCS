import { memo } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Tooltip } from '@/shared/components/ui/tooltip'
import { DashboardSettings } from './DashboardSettings'
import { ConnectionStatus } from './ConnectionStatus'
import type { ConnectionStatusDetails } from '../types/realtime'

/**
 * BedDashboardActionBar component: US-1.2, US-16.1
 * Container for top-level dashboard actions like Adding Virtual Beds, Settings, and Connection Status.
 */
interface BedDashboardActionBarProps {
  /** Callback to open the Add Virtual Bed modal */
  onAddVirtualBed: () => void
  /** current state of the "Confirm Critical Stages" setting */
  confirmCriticalStages: boolean
  /** Callback to toggle the critical stage confirmation setting */
  onToggleConfirmation: () => void
  /** current real-time connection status object */
  connectionStatus: ConnectionStatusDetails
  /** Callback to manually trigger a reconnection attempt */
  onReconnect: () => void
}

/**
 * Component for the dashboard's top-right action area.
 */
export const BedDashboardActionBar = memo(function BedDashboardActionBar({
  onAddVirtualBed,
  confirmCriticalStages,
  onToggleConfirmation,
  connectionStatus,
  onReconnect,
}: BedDashboardActionBarProps) {
  return (
    <div className="flex justify-end items-center gap-2" data-help-id="dashboard-actions">
      <Tooltip content="Create temporary virtual bed" side="left">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddVirtualBed}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border-status-virtual/30 bg-status-virtual/5 text-status-virtual hover:bg-status-virtual/10 transition-colors font-semibold"
          title="Add virtual (hallway/stretcher) bed"
          aria-label="Add virtual hallway or stretcher bed"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-xs font-medium">Add Virtual Bed</span>
        </Button>
      </Tooltip>
      <DashboardSettings enabled={confirmCriticalStages} onToggle={onToggleConfirmation} />
      <ConnectionStatus status={connectionStatus} onReconnect={onReconnect} />
    </div>
  )
})
