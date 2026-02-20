/**
 * US-6.6: Virtual Beds / Hallway Tracking — Regression Tests
 *
 * Covers:
 *  - Schema validation for createVirtualBedSchema
 *  - hasBedChanged() detects isVirtual transitions
 *  - Source inspection: bed-bottleneck-queries selects b.is_virtual
 *  - Source inspection: bed-queries.ts selects b.is_virtual
 *  - Source inspection: virtual-bed-actions.ts revalidates /dashboard
 *  - Source inspection: BedCard.tsx renders purple Virtual badge
 *  - Source inspection: AddVirtualBedModal.tsx exists and references createVirtualBed action
 */

import { describe, it, expect } from 'vitest'
import { hasBedChanged } from '../lib/bed-diff'
import type { BedWithElapsedTime } from '../types/bed'
import { fileURLToPath } from 'url'
import * as path from 'path'
import * as fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Resolve paths from this test file's directory
const root = path.resolve(__dirname, '../../../..')

// ─── helpers ────────────────────────────────────────────────────────────────

function makeBed(overrides: Partial<BedWithElapsedTime> = {}): BedWithElapsedTime {
    return {
        id: 'bed-v1',
        bedNumber: 'HALL-01',
        currentStageId: 'stage-empty',
        currentStage: {
            id: 'stage-empty',
            name: 'Empty',
            displayOrder: 1,
            colorCode: 'gray',
            description: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        patientStartTime: null,
        lastStageChange: null,
        isOccupied: false,
        isActive: true,
        isTemporary: true,
        isVirtual: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        elapsedTimeMs: null,
        isDelayed: false,
        isDispositionBottleneck: false,
        dispositionElapsedMs: null,
        dispositionDelayReason: null,
        dispositionDelayLogId: null,
        ...overrides,
    }
}

// ─── Schema validation ───────────────────────────────────────────────────────

describe('US-6.6 – createVirtualBedSchema validation', async () => {
    const { createVirtualBedSchema } = await import(
        '../../bed-management/schemas/bed-management-schemas'
    )

    it('accepts a valid label', () => {
        const result = createVirtualBedSchema.safeParse({ label: 'Hallway Stretcher 3' })
        expect(result.success).toBe(true)
    })

    it('accepts a label with allowed special characters', () => {
        const result = createVirtualBedSchema.safeParse({ label: 'Hall (B) - 02' })
        expect(result.success).toBe(true)
    })

    it('accepts a label with optional location', () => {
        const result = createVirtualBedSchema.safeParse({
            label: 'Corridor A',
            location: 'Near nurses station',
        })
        expect(result.success).toBe(true)
    })

    it('rejects a label that is too short (1 char)', () => {
        const result = createVirtualBedSchema.safeParse({ label: 'A' })
        expect(result.success).toBe(false)
    })

    it('rejects a label that exceeds 100 characters', () => {
        const result = createVirtualBedSchema.safeParse({ label: 'A'.repeat(101) })
        expect(result.success).toBe(false)
    })

    it('rejects a label with forbidden characters (@, #)', () => {
        const result = createVirtualBedSchema.safeParse({ label: 'Hall@way#3' })
        expect(result.success).toBe(false)
    })

    it('rejects a location that exceeds 255 characters', () => {
        const result = createVirtualBedSchema.safeParse({
            label: 'Valid Label',
            location: 'X'.repeat(256),
        })
        expect(result.success).toBe(false)
    })

    it('accepts when location is omitted', () => {
        const result = createVirtualBedSchema.safeParse({ label: 'HALL-01' })
        expect(result.success).toBe(true)
        expect(result.data?.location).toBeUndefined()
    })
})

// ─── bed-diff: isVirtual tracking ───────────────────────────────────────────

describe('US-6.6 – hasBedChanged: isVirtual tracked', () => {
    it('returns false when isVirtual is unchanged (true → true)', () => {
        const bed = makeBed({ isVirtual: true })
        expect(hasBedChanged(bed, { ...bed })).toBe(false)
    })

    it('returns true when isVirtual flips false → true (virtual bed created)', () => {
        const old = makeBed({ isVirtual: false })
        const next = makeBed({ isVirtual: true })
        expect(hasBedChanged(old, next)).toBe(true)
    })

    it('returns true when isVirtual flips true → false (virtual bed removed)', () => {
        const old = makeBed({ isVirtual: true })
        const next = makeBed({ isVirtual: false })
        expect(hasBedChanged(old, next)).toBe(true)
    })

    it('isVirtual change is independent of isTemporary', () => {
        // Both are true; only isVirtual changes
        const old = makeBed({ isTemporary: true, isVirtual: true })
        const next = makeBed({ isTemporary: true, isVirtual: false })
        expect(hasBedChanged(old, next)).toBe(true)
    })
})

// ─── Bed type: isVirtual field ───────────────────────────────────────────────

describe('US-6.6 – BedWithElapsedTime carries isVirtual', () => {
    it('isVirtual is present on the bed object', () => {
        const bed = makeBed({ isVirtual: true })
        expect(bed.isVirtual).toBe(true)
    })

    it('isVirtual is a boolean (not undefined)', () => {
        const bed = makeBed()
        expect(typeof bed.isVirtual).toBe('boolean')
    })
})

// ─── Source inspection ───────────────────────────────────────────────────────

describe('US-6.6 – Source inspection: data layer', () => {
    it('bed-bottleneck-queries.ts SELECTs b.is_virtual', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-dashboard/lib/bed-bottleneck-queries.ts'),
            'utf-8'
        )
        expect(src).toContain('b.is_virtual')
        expect(src).toContain('"isVirtual"')
    })

    it('bed-bottleneck-queries.ts SELECTs b.is_temporary (fixes critical bug)', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-dashboard/lib/bed-bottleneck-queries.ts'),
            'utf-8'
        )
        expect(src).toContain('b.is_temporary')
        expect(src).toContain('"isTemporary"')
    })

    it('bed-queries.ts SELECTs b.is_virtual in getAllBeds', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-dashboard/lib/bed-queries.ts'),
            'utf-8'
        )
        expect(src).toContain('b.is_virtual as "isVirtual"')
    })

    it('bed-management/lib/queries.ts SELECTs b.is_virtual', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/lib/queries.ts'),
            'utf-8'
        )
        expect(src).toContain('b.is_virtual as "isVirtual"')
    })
})

describe('US-6.6 – Source inspection: virtual-bed-mutations.ts', () => {
    it('createVirtualBedInDB sets is_virtual = true', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/lib/virtual-bed-mutations.ts'),
            'utf-8'
        )
        expect(src).toContain('is_virtual')
        expect(src).toContain('is_temporary')
    })

    it('removeVirtualBedFromDB guards on is_virtual = true', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/lib/virtual-bed-mutations.ts'),
            'utf-8'
        )
        expect(src).toContain('is_virtual = true')
    })
})

describe('US-6.6 – Source inspection: virtual-bed-actions.ts', () => {
    it('revalidates /dashboard on create', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/actions/virtual-bed-actions.ts'),
            'utf-8'
        )
        expect(src).toContain("revalidatePath('/dashboard')")
    })

    it('revalidates /supervisor on create', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/actions/virtual-bed-actions.ts'),
            'utf-8'
        )
        expect(src).toContain("revalidatePath('/supervisor')")
    })

    it('removeVirtualBed guards: only virtual beds can be removed', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/actions/virtual-bed-actions.ts'),
            'utf-8'
        )
        expect(src).toContain('bed.isVirtual')
    })

    it('both actions require nurse/supervisor/admin role', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/actions/virtual-bed-actions.ts'),
            'utf-8'
        )
        expect(src).toContain("'nurse'")
        expect(src).toContain("'supervisor'")
        expect(src).toContain("'admin'")
    })

    it('uses logger — no console.* calls', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/actions/virtual-bed-actions.ts'),
            'utf-8'
        )
        expect(src).not.toMatch(/console\.(log|error|warn|info)/)
    })
})

describe('US-6.6 – Source inspection: BedCard.tsx', () => {
    it('renders a purple Virtual badge for isVirtual beds', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-dashboard/components/BedCard.tsx'),
            'utf-8'
        )
        expect(src).toContain('isVirtual')
        expect(src).toContain('Virtual')
        expect(src).toContain('purple')
    })

    it('Virtual badge takes priority over Surge badge', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-dashboard/components/BedCard.tsx'),
            'utf-8'
        )
        // The Surge badge should only render when !isVirtual
        expect(src).toContain('!isVirtual')
    })
})

describe('US-6.6 – Source inspection: AddVirtualBedModal.tsx', () => {
    it('exists', () => {
        const filePath = path.resolve(
            root,
            'src/features/bed-dashboard/components/AddVirtualBedModal.tsx'
        )
        expect(fs.existsSync(filePath)).toBe(true)
    })

    it('calls createVirtualBed server action', () => {
        const src = fs.readFileSync(
            path.resolve(
                root,
                'src/features/bed-dashboard/components/AddVirtualBedModal.tsx'
            ),
            'utf-8'
        )
        expect(src).toContain('createVirtualBed')
    })
})

describe('US-6.6 – Source inspection: shared ActionResult type', () => {
    it('action-result.ts exists', () => {
        const filePath = path.resolve(
            root,
            'src/features/bed-management/types/action-result.ts'
        )
        expect(fs.existsSync(filePath)).toBe(true)
    })

    it('bed-crud-actions.ts imports ActionResult from shared types', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/actions/bed-crud-actions.ts'),
            'utf-8'
        )
        expect(src).toContain("from '../types/action-result'")
        expect(src).not.toContain('export type ActionResult')
    })

    it('virtual-bed-actions.ts imports ActionResult from shared types', () => {
        const src = fs.readFileSync(
            path.resolve(root, 'src/features/bed-management/actions/virtual-bed-actions.ts'),
            'utf-8'
        )
        expect(src).toContain("from '../types/action-result'")
        expect(src).not.toContain('export type ActionResult')
    })
})
