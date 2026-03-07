// CSV parser utilities for historical data import
// US-11.5: Parse CSV rows into typed import records

export interface CsvRow {
    bed_number: string
    from_stage?: string
    to_stage: string
    transition_time: string   // ISO string
    duration_seconds?: string
    notes?: string
}

export interface ImportRowResult {
    row: number
    status: 'ok' | 'error'
    bed_number?: string
    error?: string
}

export interface ImportSummary {
    total: number
    imported: number
    failed: number
    errors: ImportRowResult[]
}

/** Minimal CSV parser — handles quoted fields with commas, no nested quotes */
export function parseCSV(text: string): CsvRow[] {
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

export function splitLine(line: string): string[] {
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
