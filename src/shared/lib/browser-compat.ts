import type {
  BrowserCompatibilityInfo,
  BrowserCompatibilityTier,
  BrowserFamily,
} from '@/shared/types/browser-compat.types'

const MIN_SUPPORTED: Record<Exclude<BrowserFamily, 'unknown'>, number> = {
  chrome: 123,
  firefox: 124,
  safari: 17,
  edge: 123,
}

const MIN_LIMITED: Record<Exclude<BrowserFamily, 'unknown'>, number> = {
  chrome: 109,
  firefox: 102,
  safari: 15,
  edge: 109,
}

function parseVersion(regex: RegExp, userAgent: string): number | null {
  const match = userAgent.match(regex)
  if (!match) return null
  const major = Number.parseInt(match[1], 10)
  return Number.isFinite(major) ? major : null
}

export function parseBrowserFromUserAgent(userAgent: string): {
  family: BrowserFamily
  majorVersion: number | null
} {
  if (!userAgent) return { family: 'unknown', majorVersion: null }

  if (/Edg\//.test(userAgent)) {
    return { family: 'edge', majorVersion: parseVersion(/Edg\/(\d+)/, userAgent) }
  }

  if (/Firefox\//.test(userAgent)) {
    return { family: 'firefox', majorVersion: parseVersion(/Firefox\/(\d+)/, userAgent) }
  }

  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) {
    return { family: 'chrome', majorVersion: parseVersion(/(?:Chrome|CriOS)\/(\d+)/, userAgent) }
  }

  if (/Safari\//.test(userAgent) && /Version\//.test(userAgent)) {
    return { family: 'safari', majorVersion: parseVersion(/Version\/(\d+)/, userAgent) }
  }

  return { family: 'unknown', majorVersion: null }
}

export function detectMissingModernFeatures(): string[] {
  if (typeof window === 'undefined') return []

  const missing: string[] = []
  if (typeof window.fetch !== 'function') missing.push('fetch')
  if (typeof window.Promise !== 'function') missing.push('Promise')
  if (typeof window.AbortController !== 'function') missing.push('AbortController')
  if (typeof window.localStorage === 'undefined') missing.push('localStorage')
  if (typeof window.crypto?.subtle === 'undefined') missing.push('crypto.subtle')

  return missing
}

function resolveTier(
  family: BrowserFamily,
  version: number | null,
  missingFeatures: string[]
): { tier: BrowserCompatibilityTier; reason: string } {
  if (missingFeatures.length > 0) {
    return {
      tier: 'unsupported',
      reason: `Missing required browser APIs: ${missingFeatures.join(', ')}`,
    }
  }

  if (family === 'unknown' || version === null) {
    return {
      tier: 'unsupported',
      reason: 'Browser could not be identified. Please use Chrome, Firefox, Safari, or Edge.',
    }
  }

  const supportedVersion = MIN_SUPPORTED[family]
  const limitedVersion = MIN_LIMITED[family]

  if (version >= supportedVersion) {
    return { tier: 'supported', reason: 'Fully supported browser version.' }
  }

  if (version >= limitedVersion) {
    return {
      tier: 'limited',
      reason: 'Browser is older than our primary support window. Some visual enhancements are reduced.',
    }
  }

  return {
    tier: 'unsupported',
    reason: 'Browser is too old for safe operation. Please upgrade to a newer version.',
  }
}

export function detectBrowserCompatibilityFromUserAgent(userAgent: string): BrowserCompatibilityInfo {
  const parsed = parseBrowserFromUserAgent(userAgent)
  const tierInfo = resolveTier(parsed.family, parsed.majorVersion, [])
  return {
    family: parsed.family,
    majorVersion: parsed.majorVersion,
    tier: tierInfo.tier,
    missingFeatures: [],
    reason: tierInfo.reason,
  }
}

export function detectBrowserCompatibilityOnClient(): BrowserCompatibilityInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      family: 'unknown',
      majorVersion: null,
      tier: 'unsupported',
      missingFeatures: [],
      reason: 'Browser environment is unavailable.',
    }
  }

  const parsed = parseBrowserFromUserAgent(navigator.userAgent)
  const missingFeatures = detectMissingModernFeatures()
  const tierInfo = resolveTier(parsed.family, parsed.majorVersion, missingFeatures)

  return {
    family: parsed.family,
    majorVersion: parsed.majorVersion,
    tier: tierInfo.tier,
    missingFeatures,
    reason: tierInfo.reason,
  }
}
