import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'url'
import * as path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function readFile(relativePath: string): Promise<string> {
  const fs = await import('fs')
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8')
}

describe('US-19.2 route smoke checks', () => {
  it('cron webhook dispatch route is protected by CRON_SECRET auth', async () => {
    const src = await readFile('../../../../app/api/cron/webhooks/dispatch/route.ts')

    expect(src).toContain('process.env.CRON_SECRET')
    expect(src).toContain("return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })")
    expect(src).toContain('dispatchDueWebhooks')
  })

  it('admin endpoint route exposes CRUD handlers', async () => {
    const src = await readFile('../../../../app/api/webhooks/endpoints/route.ts')

    expect(src).toContain('export async function GET')
    expect(src).toContain('export async function POST')
    expect(src).toContain('export async function PATCH')
    expect(src).toContain('export async function DELETE')
    expect(src).toContain('session.role !== \'admin\'')
  })
})
