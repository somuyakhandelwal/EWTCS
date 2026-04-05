export type BrowserFamily = 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown'

export type BrowserCompatibilityTier = 'supported' | 'limited' | 'unsupported'

export interface BrowserCompatibilityInfo {
  family: BrowserFamily
  majorVersion: number | null
  tier: BrowserCompatibilityTier
  missingFeatures: string[]
  reason: string
}

export interface BrowserTrackingPayload {
  path?: string
  browserFamily?: BrowserFamily
  browserVersion?: number | null
  compatibilityTier?: BrowserCompatibilityTier
}
