import 'server-only'
import { isIP } from 'net'

function normalizeIpCandidate(rawValue: string): string {
  const trimmed = rawValue.trim()

  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('[')) {
    const closingBracket = trimmed.indexOf(']')
    if (closingBracket > 0) {
      return trimmed.slice(1, closingBracket)
    }
  }

  if (trimmed.includes('.') && trimmed.includes(':')) {
    return trimmed.split(':')[0]
  }

  return trimmed
}

export function getClientIpFromHeaders(requestHeaders: Headers): string | null {
  const forwardedFor = requestHeaders.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]
    const candidate = normalizeIpCandidate(firstIp)
    if (isIP(candidate)) {
      return candidate
    }
  }

  const candidates = [
    requestHeaders.get('x-real-ip'),
    requestHeaders.get('cf-connecting-ip'),
    requestHeaders.get('x-client-ip'),
  ]

  for (const value of candidates) {
    if (!value) continue
    const candidate = normalizeIpCandidate(value)
    if (isIP(candidate)) {
      return candidate
    }
  }

  return null
}
