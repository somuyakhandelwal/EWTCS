/**
 * External API Key Authentication
 * US-19.1: REST API for External Systems
 *
 * Validates Bearer token from Authorization header against
 * the EXTERNAL_API_KEY environment variable.
 *
 * Usage:
 *   const auth = verifyApiKey(request)
 *   if (!auth.ok) return auth.response
 */

import { type NextRequest, NextResponse } from 'next/server'

export interface ApiKeyAuth {
  ok: true
}
export interface ApiKeyAuthFail {
  ok: false
  response: NextResponse
}

export type ApiKeyResult = ApiKeyAuth | ApiKeyAuthFail

/**
 * Verify the Bearer token in the Authorization header matches
 * the configured EXTERNAL_API_KEY. Returns `{ ok: true }` on success
 * or `{ ok: false, response }` with an error response on failure.
 */
export function verifyApiKey(request: NextRequest): ApiKeyResult {
  const apiKey = process.env.EXTERNAL_API_KEY
  if (!apiKey) {
    // API integration is disabled when env var is not configured
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'External API is not configured on this server.' },
        { status: 503 }
      ),
    }
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing Authorization: Bearer <token> header.' },
        { status: 401 }
      ),
    }
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(token, apiKey)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid API key.' }, { status: 403 }),
    }
  }

  return { ok: true }
}

/** Constant-time string comparison to prevent timing-based attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
