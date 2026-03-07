// Tests — shared/lib/csv-download.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadCsv } from '../csv-download'

describe('downloadCsv', () => {
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL

    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:mock-url')
        URL.revokeObjectURL = vi.fn()
        // Minimal DOM stub
        const anchor = {
            href: '',
            download: '',
            click: vi.fn(),
        }
        vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement)
        vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n)
        vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n)
    })

    afterEach(() => {
        URL.createObjectURL = originalCreateObjectURL
        URL.revokeObjectURL = originalRevokeObjectURL
        vi.restoreAllMocks()
    })

    it('creates a blob and triggers a download', () => {
        downloadCsv('a,b\n1,2', 'test.csv')
        expect(URL.createObjectURL).toHaveBeenCalledOnce()
        expect(document.body.appendChild).toHaveBeenCalledOnce()
        expect(document.body.removeChild).toHaveBeenCalledOnce()
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('sets the correct download filename', () => {
        const anchor = document.createElement('a') as unknown as { download: string; click: () => void }
        downloadCsv('data', 'report-2026.csv')
        expect(anchor.download).toBe('report-2026.csv')
    })

    it('is a no-op in non-browser environments', () => {
        const originalWindow = globalThis.window
        Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true })
        expect(() => downloadCsv('csv', 'file.csv')).not.toThrow()
        Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
    })
})
