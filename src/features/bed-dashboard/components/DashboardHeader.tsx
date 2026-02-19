import { DashboardSettings } from './DashboardSettings'
import { ConnectionStatus } from './ConnectionStatus'
import type { ConnectionStatusDetails } from '../types/realtime'

/**
 * Props for the DashboardHeader component
 */
interface DashboardHeaderProps {
    settings: { confirmCriticalStages: boolean }
    toggleConfirmation: () => void
    connectionStatus: ConnectionStatusDetails
    reconnect: () => void
}

/**
 * DashboardHeader Component
 * 
 * Renders the top bar of the dashboard, containing:
 * - Global settings (e.g., confirmation toggles)
 * - Real-time connection status indicator
 * 
 * This component keeps the main layout clean by encapsulating header controls.
 */
export function DashboardHeader({
    settings,
    toggleConfirmation,
    connectionStatus,
    reconnect
}: DashboardHeaderProps) {
    return (
        <div className="flex justify-end items-center gap-2">
            <DashboardSettings
                enabled={settings.confirmCriticalStages}
                onToggle={toggleConfirmation}
            />
            <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
        </div>
    )
}
