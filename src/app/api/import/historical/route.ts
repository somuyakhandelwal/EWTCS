// Historical Data Import API Route
// US-11.5: Import historical data from existing systems via CSV
// POST /api/import/historical

import { type NextRequest, NextResponse } from 'next/server'
import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { logAudit } from '@/shared/lib/audit'
import { hasPII } from '@/shared/lib/pii'
import pool from '@/shared/lib/db'

// ---------------------------------------------------------------------------
// CSV row shape after parsing
// ---------------------------------------------------------------------------
interface CsvRow {
    bed_number: string
    from_stage?: string
    to_stage: string
    transition_time: string   // ISO string
    duration_seconds?: string
    notes?: string
}

interface ImportRowResult {
    row: number
    status: 'ok' | 'error'
    bed_number?: string
    error?: string
}

interface ImportSummary {
    total: number
    imported: number
    failed: number
    errors: ImportRowResult[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal CSV parser — handles quoted fields with commas, no nested quotes */
function parseCSV(text: string): CsvRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return []

    const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase())
    const rows: CsvRow[] = []

    for (let i = 1; i < lines.length; i++) {
        const values = splitLine(lines[i])
        const obj: Record<string, string> = {}
        headers.forEach((h, idx) => { obj[h] = (values[idx] ?? '').trim() })
        rows.push(obj as unknown as CsvRow)
    }
    return rows
}

function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuotes = !inQuotes; continue }
        if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
        current += ch
    }
    result.push(current)
    return result
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    // Auth: admin only
    const session = await verifyActiveSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let formData: FormData
    try {
        formData = await request.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    // Size guard — 10 MB max
    if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
        return NextResponse.json({ error: 'No data rows found in CSV' }, { status: 400 })
    }
    if (rows.length > 10_000) {
        return NextResponse.json({ error: 'Too many rows (max 10,000 per import)' }, { status: 400 })
    }

    // Load lookup maps
    const [bedRes, stageRes] = await Promise.all([
        pool.query<{ id: string; bed_number: string }>('SELECT id, bed_number FROM beds WHERE is_active = true'),
        pool.query<{ id: string; name: string }>('SELECT id, name FROM stages WHERE is_active = true'),
    ])
    const bedMap   = new Map(bedRes.rows.map((r) => [r.bed_number.toUpperCase(), r.id]))
    const stageMap = new Map(stageRes.rows.map((r) => [r.name.toLowerCase(), r.id]))

    // Validate & insert each row
    const results: ImportRowResult[] = []
    let imported = 0
    let failed   = 0

    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        for (let i = 0; i < rows.length; i++) {
            const r        = rows[i]
            const rowNum   = i + 2  // 1-based, offset for header

            // Validate required fields
            if (!r.bed_number) {
                results.push({ row: rowNum, status: 'error', error: 'Missing bed_number' })
                failed++
                continue
            }
            if (!r.to_stage) {
                results.push({ row: rowNum, status: 'error', bed_number: r.bed_number, error: 'Missing to_stage' })
                failed++
                continue
            }
            if (!r.transition_time) {
                results.push({ row: rowNum, status: 'error', bed_number: r.bed_number, error: 'Missing transition_time' })
                failed++
                continue
            }

            const bedId = bedMap.get(r.bed_number.toUpperCase())
            if (!bedId) {
                results.push({ row: rowNum, status: 'error', bed_number: r.bed_number, error: `Unknown bed: ${r.bed_number}` })
                failed++
                continue
            }

            const toStageId = stageMap.get(r.to_stage.toLowerCase())
            if (!toStageId) {
                results.push({ row: rowNum, status: 'error', bed_number: r.bed_number, error: `Unknown stage: ${r.to_stage}` })
                failed++
                continue
            }

            const fromStageId = r.from_stage ? (stageMap.get(r.from_stage.toLowerCase()) ?? null) : null

            const ts = new Date(r.transition_time)
            if (isNaN(ts.getTime())) {
                results.push({ row: rowNum, status: 'error', bed_number: r.bed_number, error: `Invalid transition_time: ${r.transition_time}` })
                failed++
                continue
            }

            const durationMs = r.duration_seconds
                ? Math.round(parseFloat(r.duration_seconds) * 1000)
                : null

            // US-17.8: Backend PII safety valve — reject rows with PII in notes
            if (r.notes && hasPII(r.notes)) {
                results.push({ row: rowNum, status: 'error', bed_number: r.bed_number, error: 'Notes field may contain patient-identifiable information. Please remove PII and re-import.' })
                failed++
                continue
            }

            await client.query(
                `INSERT INTO bed_stage_logs_archive
                 (bed_id, from_stage_id, to_stage_id, transition_time, duration_in_previous_stage_ms, notes)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT DO NOTHING`,
                [bedId, fromStageId, toStageId, ts.toISOString(), durationMs, r.notes || null]
            )

            results.push({ row: rowNum, status: 'ok', bed_number: r.bed_number })
            imported++
        }

        await client.query('COMMIT')
    } catch {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Database error during import' }, { status: 500 })
    } finally {
        client.release()
    }

    // Audit log
    await logAudit({
        actionType: 'CREATE',
        entityType: 'bed_stage_logs_archive',
        entityId: 'csv_import',
        performedBy: session.userId as string,
        changes: { total: rows.length, imported, failed, filename: file.name },
        reason: 'Historical CSV data import (US-11.5)',
    })

    const summary: ImportSummary = {
        total: rows.length,
        imported,
        failed,
        errors: results.filter((r) => r.status === 'error').slice(0, 100),  // cap error list
    }

    return NextResponse.json(summary, { status: 200 })
}
