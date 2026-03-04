import { describe, it, expect, vi, beforeEach } from 'vitest'
import { restoreKioskSession } from '@/features/auth/lib/kiosk'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import pool from './db'

vi.mock('jose', () => ({
    jwtVerify: vi.fn(),
    SignJWT: vi.fn().mockImplementation(() => ({
        setProtectedHeader: vi.fn().mockReturnThis(),
        setIssuedAt: vi.fn().mockReturnThis(),
        setExpirationTime: vi.fn().mockReturnThis(),
        sign: vi.fn().mockResolvedValue('fake-token')
    }))
}))

vi.mock('next/headers', () => ({
    cookies: vi.fn()
}))

vi.mock('./db', () => ({
    default: {
        query: vi.fn()
    }
}))

vi.mock('@/shared/config/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}))

describe('restoreKioskSession', () => {
    const mockCookieStore = {
        set: vi.fn(),
        get: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)
    })

    it('successfully restores a valid kiosk session', async () => {
        const token = 'valid-kiosk-token'
        const payload = {
            userId: 'u1',
            isKiosk: true,
            kioskSessionId: 'ks1',
            role: 'nurse'
        }

        vi.mocked(jwtVerify).mockResolvedValue({ payload } as any)
        vi.mocked(pool.query).mockResolvedValue({ rows: [{ 1: 1 }] } as any)

        const result = await restoreKioskSession(token)

        expect(result).toEqual(payload)
        expect(mockCookieStore.set).toHaveBeenCalledWith('session', token, expect.objectContaining({
            maxAge: 365 * 24 * 60 * 60
        }))
    })

    it('fails if token is not for a kiosk', async () => {
        const token = 'standard-token'
        const payload = {
            userId: 'u1',
            isKiosk: false,
            role: 'nurse'
        }

        vi.mocked(jwtVerify).mockResolvedValue({ payload } as any)

        const result = await restoreKioskSession(token)

        expect(result).toBeNull()
        expect(mockCookieStore.set).not.toHaveBeenCalled()
    })

    it('fails if kiosk session is revoked in DB', async () => {
        const token = 'revoked-token'
        const payload = {
            userId: 'u1',
            isKiosk: true,
            kioskSessionId: 'ks-revoked',
            role: 'nurse'
        }

        vi.mocked(jwtVerify).mockResolvedValue({ payload } as any)
        vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any)

        const result = await restoreKioskSession(token)

        expect(result).toBeNull()
        expect(mockCookieStore.set).not.toHaveBeenCalled()
    })

    it('fails on invalid JWT signature', async () => {
        vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid signature'))

        const result = await restoreKioskSession('invalid-token')

        expect(result).toBeNull()
        expect(mockCookieStore.set).not.toHaveBeenCalled()
    })
})
