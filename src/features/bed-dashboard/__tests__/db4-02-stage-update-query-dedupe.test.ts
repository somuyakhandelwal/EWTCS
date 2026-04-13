import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'url'
import * as path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('DB4-02 – updateBedStage avoids duplicate bed fetch', () => {
  it('bed-actions fetches bed before ward check and reuses it', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../actions/bed-actions.ts'),
      'utf-8'
    )

    const bedFetchFirst = src.indexOf('const bed = await getBedById(result.data.bedId)')
    const wardCheck = src.indexOf('const wardError = await checkWardAccess(')
    expect(bedFetchFirst).toBeGreaterThan(-1)
    expect(wardCheck).toBeGreaterThan(-1)
    expect(bedFetchFirst).toBeLessThan(wardCheck)

    const bedFetchCount = (src.match(/await getBedById\(result\.data\.bedId\)/g) ?? []).length
    expect(bedFetchCount).toBe(1)
    expect(src).toContain('prefetchedBedInfo')
  })

  it('bed-access-queries supports prefetched bed info path', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../lib/bed-access-queries.ts'),
      'utf-8'
    )

    expect(src).toContain('prefetchedBedInfo?: BedAccessInfo')
    expect(src).toContain("const bedInfo = prefetchedBedInfo ?? await getBedAccessInfo(bedId)")
    expect(src).toContain("if (role === 'admin' || role === 'supervisor') return null")
  })
})
