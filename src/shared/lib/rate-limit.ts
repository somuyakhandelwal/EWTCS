let lastCleanup = Date.now()
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Simple in-memory rate limiter.
 * In a multi-instance production environment, this should ideally be replaced with Redis.
 */
export function isRateLimited(
    identifier: string,
    limit: number,
    windowMs: number
): boolean {
    const now = Date.now()

    // Passive memory clean-up
    if (now - lastCleanup > windowMs * 2) {
        lastCleanup = now
        for (const [key, value] of rateLimitMap.entries()) {
            if (now > value.resetTime) {
                rateLimitMap.delete(key)
            }
        }
    }

    const record = rateLimitMap.get(identifier)

    if (!record || now > record.resetTime) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
        return false
    }

    if (record.count >= limit) {
        return true
    }

    record.count += 1
    return false
}
