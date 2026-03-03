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
    bg: 'bg-status-success/10',
    border: 'border-status-success/30',
    text: 'text-status-success',
    label: 'text-status-success/80',
    icon: <CheckCircle className="h-8 w-8 text-status-success" />,
    message: 'All patients on track',
  }
  if (count <= 2) return {
    bg: 'bg-status-cleaning/10',
    border: 'border-status-cleaning/30',
    text: 'text-status-cleaning',
    label: 'text-status-cleaning/80',
    icon: <Clock className="h-8 w-8 text-status-cleaning" />,
    message: 'Requires attention',
  }
  return {
    bg: 'bg-status-delayed/10',
    border: 'border-status-delayed/30',
    text: 'text-status-delayed',
    label: 'text-status-delayed/80',
    icon: <AlertTriangle className="h-8 w-8 text-status-delayed" />,
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