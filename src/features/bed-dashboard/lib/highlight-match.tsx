// Utility: highlight a search query match inside a string with a yellow span
import { Fragment } from 'react'

export function highlightMatch(text: string, query?: string) {
  if (!query) return text
  const q = query.trim().toLowerCase()
  if (!q) return text
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return (
    <Fragment>
      {before}
      <span className="bg-yellow-300 text-black px-1 rounded">{match}</span>
      {after}
    </Fragment>
  )
}
