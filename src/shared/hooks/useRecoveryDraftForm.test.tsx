import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecoveryDraftForm } from './useRecoveryDraftForm'

interface DraftValues {
  a: string
  b: string
}

const DRAFT_KEY = 'test:hook:draft'

function renderRecoveryHook(values: DraftValues, baseline: DraftValues, onRestore = vi.fn()) {
  return renderHook(() => useRecoveryDraftForm<DraftValues>({
    draftKey: DRAFT_KEY,
    values,
    baseline,
    onRestore,
    restorePrompt: 'Restore?',
    restoredEvent: 'restored',
    rejectedEvent: 'rejected',
  }))
}

describe('useRecoveryDraftForm', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('restores draft when user confirms', () => {
    const onRestore = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      data: { a: 'x', b: 'y' },
    }))

    const { result } = renderRecoveryHook({ a: '1', b: '2' }, { a: '1', b: '2' }, onRestore)

    expect(onRestore).toHaveBeenCalledWith({ a: 'x', b: 'y' })
    expect(result.current.restoredNotice).toBe(true)
  })

  it('rejects restore and clears saved draft', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      data: { a: 'x', b: 'y' },
    }))

    renderRecoveryHook({ a: '1', b: '2' }, { a: '1', b: '2' })

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('persists dirty values and clears when values match baseline', () => {
    const { rerender } = renderHook(
      ({ values, baseline }) => useRecoveryDraftForm<DraftValues>({
        draftKey: DRAFT_KEY,
        values,
        baseline,
        onRestore: vi.fn(),
        restorePrompt: 'Restore?',
        restoredEvent: 'restored',
        rejectedEvent: 'rejected',
      }),
      {
        initialProps: {
          values: { a: 'dirty', b: '2' },
          baseline: { a: '1', b: '2' },
        },
      }
    )

    expect(localStorage.getItem(DRAFT_KEY)).toContain('dirty')

    rerender({ values: { a: '1', b: '2' }, baseline: { a: '1', b: '2' } })
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('does not throw when storage access fails', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    expect(() => {
      renderRecoveryHook({ a: 'dirty', b: '2' }, { a: '1', b: '2' })
    }).not.toThrow()

    setItemSpy.mockRestore()
  })
})