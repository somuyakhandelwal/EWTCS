// Kiosk Banner Component
// Epic 5: Authentication & Role-Based Access (US-5.3)
// Purpose: Visible top bar confirming kiosk mode is active on this workstation

import { Monitor } from 'lucide-react'

interface KioskBannerProps {
  username: string
  kioskIp?: string
}

/**
 * Rendered at the top of the dashboard / supervisor page when
 * the current session was created with kiosk mode enabled.
 */
export function KioskBanner({ username, kioskIp }: KioskBannerProps) {
  return (
    <div className="flex items-center justify-between bg-emerald-950 border-b border-emerald-800 px-4 py-2">
      <div className="flex items-center gap-2">
        <Monitor className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
          Kiosk Mode
        </span>
        <span className="text-xs text-emerald-500">·</span>
        <span className="text-xs text-emerald-400">
          Workstation stays signed in · {username}
        </span>
      </div>
      {kioskIp && (
        <span className="text-[10px] text-emerald-600 font-mono hidden sm:block">
          Bound: {kioskIp}
        </span>
      )}
    </div>
  )
}
