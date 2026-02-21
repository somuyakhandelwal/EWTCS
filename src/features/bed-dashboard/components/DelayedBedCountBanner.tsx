// DelayedBedCountBanner.tsx
// US-15.x: Prominent delayed bed count with color coding and click-to-filter
// Epic 15: Notifications & Alerts

'use client'

import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface DelayedBedCountBannerProps {
  delayedCount: number
  onFilterDelayed: () => void
  isFiltered: boolean
}

function getBannerStyle(count: number) {
  if (count === 0) return {
    bg: 'bg-green-950/40',
    border: 'border-green-800/50',
    text: 'text-green-400',
    label: 'text-green-300',
    icon: <CheckCircle className="h-8 w-8 text-green-400" />,
    message: 'All patients on track',
  }
  if (count <= 2) return {
    bg: 'bg-yellow-950/40',
    border: 'border-yellow-800/50',
    text: 'text-yellow-400',
    label: 'text-yellow-300',
    icon: <Clock className="h-8 w-8 text-yellow-400" />,
    message: 'Requires attention',
  }
  return {
    bg: 'bg-red-950/40',
    border: 'border-red-800/50',
    text: 'text-red-400',
    label: 'text-red-300',
    icon: <AlertTriangle className="h-8 w-8 text-red-400" />,
    message: 'Immediate action needed',
  }
}

export function DelayedBedCountBanner({
  delayedCount,
  onFilterDelayed,
  isFiltered,
}: DelayedBedCountBannerProps) {
  const style = getBannerStyle(delayedCount)

  return (
    <button
      type="button"
      onClick={onFilterDelayed}
      className={`w-full rounded-lg border ${style.bg} ${style.border} p-4 
        flex items-center justify-between gap-4 
        hover:opacity-90 transition-opacity cursor-pointer
        ${isFiltered ? 'ring-2 ring-offset-1 ring-offset-black ring-white/20' : ''}`}
    >
      <div className="flex items-center gap-4">
        {style.icon}
        <div className="text-left">
          <p className={`text-xs uppercase tracking-wider font-semibold ${style.label}`}>
            Delayed Beds
          </p>
          <p className={`text-4xl font-bold ${style.text}`}>
            {delayedCount}
          </p>
          <p className={`text-xs ${style.label} mt-0.5`}>
            {style.message}
          </p>
        </div>
      </div>
      <div className={`text-xs font-medium px-3 py-1.5 rounded-full border ${style.border} ${style.label}`}>
        {isFiltered ? 'Show All Beds' : 'View Delayed Only'}
      </div>
    </button>
  )
}