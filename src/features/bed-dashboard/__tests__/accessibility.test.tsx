import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { axe, type AxeMatchers } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { BedCard } from '../components/BedCard'
import { BedStatusLegend } from '../components/BedStatusLegend'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { StageFormModal } from '../../stage-management/components/StageFormModal'
import * as React from 'react'

expect.extend(matchers)

declare module 'vitest' {
    export interface Assertion<T = any> extends AxeMatchers { }
    export interface AsymmetricMatchersContaining extends AxeMatchers { }
}

// Mock hooks
vi.mock('../hooks/useElapsedTime', () => ({
    useElapsedTime: vi.fn(() => '2h 15m'),
}))

vi.mock('../../stage-management/hooks/useStageFormLogic', () => ({
    useStageFormLogic: vi.fn(() => ({
        name: 'Triage',
        setName: vi.fn(),
        color: 'blue',
        setColor: vi.fn(),
        desc: 'Test description',
        setDesc: vi.fn(),
        thresholdHours: '1',
        setThresholdHours: vi.fn(),
        thresholdMins: '30',
        setThresholdMins: vi.fn(),
        error: null,
        loading: false,
        saveState: 'idle',
        restoredNotice: false,
        saveStage: vi.fn(),
    })),
}))

const mockBed: any = {
    id: 'bed-1',
    bedNumber: 'ER-01',
    currentStageId: 'stage-1',
    currentStage: { id: 'stage-1', name: 'Triage', colorCode: 'blue' },
    isOccupied: true,
    isDelayed: false,
    isVirtual: false,
    isTemporary: false,
    patientStartTime: new Date(),
}

const mockStages: any = [
    { id: 'stage-1', name: 'Triage', colorCode: 'blue', displayOrder: 1, description: '', isActive: true, createdAt: '', updatedAt: '' },
    { id: 'stage-2', name: 'Assessment', colorCode: 'green', displayOrder: 2, description: '', isActive: true, createdAt: '', updatedAt: '' },
]

describe('Accessibility Audit', () => {
    it('BedCard should have no accessibility violations', async () => {
        const { container } = render(<BedCard bed={mockBed} />)
        const results = await axe(container)
        expect(results).toHaveNoViolations()
    })

    it('BedStatusLegend should have no accessibility violations', async () => {
        const { container } = render(<BedStatusLegend stages={mockStages} delayThresholdMs={180 * 60000} />)
        const results = await axe(container)
        expect(results).toHaveNoViolations()
    })

    it('ConfirmationModal should have no accessibility violations when open', async () => {
        const { container } = render(
            <ConfirmationModal
                isOpen={true}
                bedNumber="ER-01"
                fromStageName="Triage"
                toStage={{ id: 'stage-2', name: 'Assessment', colorCode: 'green' } as any}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        )
        const results = await axe(container)
        expect(results).toHaveNoViolations()
    })

    it('StageFormModal should have no accessibility violations', async () => {
        const { container } = render(
            <StageFormModal
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )
        const results = await axe(container)
        expect(results).toHaveNoViolations()
    })
})
