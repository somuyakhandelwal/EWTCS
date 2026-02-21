import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// localStorage polyfill
// jsdom requires a non-opaque origin to expose a real localStorage. When
// the environment URL is not configured (or jsdom's implementation throws),
// the recovery-draft module cannot read/write drafts and all related tests
// fail with "localStorage is not a function / SecurityError".
//
// This in-memory polyfill is unconditionally applied before each test so
// every test file that uses localStorage gets a predictable, isolated store.
// ---------------------------------------------------------------------------
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  // Reset localStorage between tests so no test leaks state into the next.
  localStorage.clear()
})
