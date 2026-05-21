import { type NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/shared/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/force-logout
 *
 * Called by Server Component pages when verifyActiveSession() returns null
 * despite a valid JWT cookie (e.g. user deleted after db:reset, deactivated
 * account, or revoked kiosk session).
 *
 * Server Components cannot write cookies, so deleteSession() silently fails
 * there. This Route Handler runs in the Node.js runtime and CAN write cookies,
 * so it reliably clears the stale session before redirecting to /login —
 * breaking the infinite-redirect loop that would otherwise occur.
 */
export async function GET(request: NextRequest) {
    await deleteSession()
    return NextResponse.redirect(new URL('/login', request.url), { status: 302 })
}
