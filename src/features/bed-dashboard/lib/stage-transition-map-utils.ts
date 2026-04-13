export type TransitionEntry = {
  allowed: string[]
  requiresOverride: string[]
  blocked: string[]
}

export function readTransitionEntry(mapLike: unknown, key: string): TransitionEntry | null {
  if (mapLike instanceof Map) {
    return (mapLike.get(key) as TransitionEntry | undefined) ?? null
  }

  if (Array.isArray(mapLike)) {
    const found = mapLike.find((item) => Array.isArray(item) && item[0] === key)
    return found ? (found[1] as TransitionEntry) : null
  }

  if (mapLike && typeof mapLike === 'object') {
    const record = mapLike as Record<string, TransitionEntry>
    return record[key] ?? null
  }

  return null
}
