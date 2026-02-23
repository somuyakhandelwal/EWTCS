// Connection Status Indicator Component
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Display Real-Time Bed Status

'use client'

import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Wifi, WifiOff, RefreshCw, Pause } from 'lucide-react'
import type { ConnectionStatusDetails } from '../types/realtime'

interface ConnectionStatusProps {
  status: ConnectionStatusDetails
  onReconnect?: () => void
}

/**
 * Visual indicator for real-time connection status
 * Shows connection state with color-coded indicators and last update time
 */
export const ConnectionStatus = React.memo(function ConnectionStatus({
  status,
  onReconnect,
}: ConnectionStatusProps) {
  const getStatusDisplay = () => {
    switch (status.status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          label: 'Live',
          showPulse: true,
        }
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          label: 'Reconnecting',
          showPulse: false,
          animate: 'animate-spin',
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          label: 'Disconnected',
          showPulse: false,
        }
      case 'paused':
        return {
          icon: Pause,
          color: 'text-zinc-500',
          bgColor: 'bg-zinc-500/10',
          label: 'Paused',
          showPulse: false,
        }
    }
  }

  const display = getStatusDisplay()
  const Icon = display.icon

  const formatLastUpdate = (date: Date | null): string => {
    if (!date) return 'Never'

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)

    if (diffSec < 60) return `${diffSec}s ago`
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    return date.toLocaleTimeString()
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${display.bgColor}`}
        role="status"
        aria-label={`Connection status: ${display.label}`}
      >
        {display.showPulse && (
          <span className="flex h-2 w-2 relative" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        {!display.showPulse && (
          <Icon className={`h-4 w-4 ${display.color} ${display.animate || ''}`} aria-hidden="true" />
        )}
        <span className={`text-sm font-medium ${display.color}`}>
          {display.label}
        </span>
      </div>

      {/* Last update time */}
      <div className="text-xs text-zinc-500">
        Updated {formatLastUpdate(status.lastUpdate)}
      </div>

      {/* Reconnect button for disconnected state */}
      {status.status === 'disconnected' && onReconnect && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReconnect}
          className="h-7 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      )}
    </div>
  )
})
