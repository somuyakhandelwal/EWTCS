import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  appendRecoveryLog,
  clearRecoveryDraft,
  clearRecoveryLogs,
  getRecoveryLogs,
  loadRecoveryDraft,
  saveRecoveryDraft,
} from './recovery-draft'

const DRAFT_KEY = 'test:recovery:draft'

describe('recovery-draft', () => {
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('saves and loads a draft envelope', () => {
    saveRecoveryDraft(DRAFT_KEY, { name: 'Triage' })

    const loaded = loadRecoveryDraft<{ name: string }>(DRAFT_KEY)
    expect(loaded).not.toBeNull()
    expect(loaded?.data).toEqual({ name: 'Triage' })
    expect(typeof loaded?.updatedAt).toBe('number')
  })

  it('clears stale drafts beyond max age', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-20T00:00:00.000Z'))
    saveRecoveryDraft(DRAFT_KEY, { value: 1 })

    vi.setSystemTime(new Date('2026-02-21T01:00:00.000Z'))

    const loaded = loadRecoveryDraft<{ value: number }>(DRAFT_KEY)
    expect(loaded).toBeNull()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('clears drafts when version mismatches', () => {
    saveRecoveryDraft(DRAFT_KEY, { value: 1 }, { version: 1 })

    const loaded = loadRecoveryDraft<{ value: number }>(DRAFT_KEY, { version: 2 })
    expect(loaded).toBeNull()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('clears invalid draft payloads safely', () => {
    localStorage.setItem(DRAFT_KEY, 'not-json')

    const loaded = loadRecoveryDraft(DRAFT_KEY)
    expect(loaded).toBeNull()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('appends recovery logs and caps retained entries', () => {
    for (let index = 0; index < 110; index += 1) {
      appendRecoveryLog('draft_saved', { index })
    }

    const logs = getRecoveryLogs()
    expect(logs).toHaveLength(100)
    expect(logs[0].context).toEqual({ index: 10 })
    expect(logs[99].context).toEqual({ index: 109 })
  })

  it('clears draft key explicitly', () => {
    saveRecoveryDraft(DRAFT_KEY, { a: 'b' })
    clearRecoveryDraft(DRAFT_KEY)
    expect(loadRecoveryDraft(DRAFT_KEY)).toBeNull()
  })

  it('clears recovery logs explicitly', () => {
    appendRecoveryLog('stage_form_saved')
    expect(getRecoveryLogs()).toHaveLength(1)

    clearRecoveryLogs()

    expect(getRecoveryLogs()).toHaveLength(0)
  })
})