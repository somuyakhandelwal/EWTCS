'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { detectBrowserCompatibilityOnClient } from '@/shared/lib/browser-compat'
import type { BrowserCompatibilityInfo } from '@/shared/types/browser-compat.types'

const DISMISS_KEY = 'ewtcs:browser-compat-dismissed'

function buildBannerId(info: BrowserCompatibilityInfo): string {
  return `${info.family}-${info.majorVersion ?? 'na'}-${info.tier}`
}

export function BrowserCompatibilityBanner() {
  const [compatibility, setCompatibility] = useState<BrowserCompatibilityInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const detected = detectBrowserCompatibilityOnClient()
    setCompatibility(detected)
    document.documentElement.dataset.browserTier = detected.tier

    const id = buildBannerId(detected)
    const stored = sessionStorage.getItem(DISMISS_KEY)
    setDismissed(stored === id)

    return () => {
      delete document.documentElement.dataset.browserTier
    }
  }, [])

  const title = useMemo(() => {
    if (!compatibility) return ''
    return compatibility.tier === 'unsupported'
      ? 'Unsupported browser detected'
      : 'Limited browser support mode'
  }, [compatibility])

  if (!compatibility || compatibility.tier === 'supported' || dismissed) {
    return null
  }

  const isUnsupported = compatibility.tier === 'unsupported'

  return (
    <div
      role="alert"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-400/40 bg-amber-950/95 text-amber-100"
      data-testid="browser-compatibility-banner"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 text-sm">
        {isUnsupported ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
        ) : (
          <Info className="h-4 w-4 shrink-0 text-amber-300" />
        )}

        <p className="flex-1">
          <span className="font-semibold">{title}.</span>{' '}
          {compatibility.reason} Recommended browsers: latest Chrome, Firefox, Safari, or Edge.
        </p>

        <Button
          type="button"
          variant="outline"
          className="h-8 border-amber-300/50 bg-amber-900/40 text-amber-100 hover:bg-amber-800/60"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, buildBannerId(compatibility))
            setDismissed(true)
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
