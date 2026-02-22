/**
 * Simple but robust CSV parser for historical data import.
 * Handles quoted values and escaped quotes (e.g., "Note with ""quote"" here").
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCSV(csvText: string): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = []
    const lines = csvText.split(/\r?\n/)

    if (lines.length < 2) return []

    // Extract headers (first row)
    const headers = parseLine(lines[0])

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = parseLine(line)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rowObj: any = {}

        headers.forEach((header, index) => {
            rowObj[header.trim()] = values[index]?.trim() || null
        })

        rows.push(rowObj)
    }

    return rows
}

/**
 * Parses a single CSV line into an array of strings.
 * Correctly handles quoted values and escaped quotes.
 */
function parseLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"'
                i++
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            result.push(current)
            current = ''
        } else {
            current += char
        }
    }

    result.push(current)
    return result
}
