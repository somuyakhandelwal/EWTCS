/**
 * PII Detection Engine — EPIC 17 (US-17.6 / US-17.7)
 *
 * Pure TypeScript, zero DB or network dependencies.
 * Used by:
 *   - usePiiGuard (client-side hook) — for real-time warnings in textareas
 *   - Server actions (bed-actions, discharge-actions, signoff-actions,
 *     stage-history-correction-write-actions) — for backend enforcement
 *
 * Patterns cover Indian healthcare context:
 *   - Phone numbers (Indian mobile + landline)
 *   - Aadhaar (12-digit, with or without spaces/dashes)
 *   - PAN card
 *   - Email addresses
 *   - Medical Record Numbers (MRN / REG / UHID)
 *   - Date of Birth (explicit labels)
 *   - Full Name patterns (Name: / Patient: labels)
 */

export type PiiCategory =
  | 'PHONE'
  | 'AADHAAR'
  | 'PAN'
  | 'EMAIL'
  | 'MRN'
  | 'DOB'
  | 'PATIENT_NAME'

export interface PiiMatch {
  category: PiiCategory
  /** Human-readable label shown in the UI warning */
  label: string
  /** The actual matched substring (redacted in logs) */
  match: string
  /** Start index in the original string */
  index: number
}

export interface PiiDetectionResult {
  hasPii: boolean
  matches: PiiMatch[]
  /** Short summary string for audit logs, e.g. "PHONE, EMAIL" */
  summary: string
}

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

const PATTERNS: Array<{
  category: PiiCategory
  label: string
  regex: RegExp
}> = [
  {
    category: 'PHONE',
    label: 'Phone number',
    // Indian mobile: optional +91/0, then 6-9 followed by 9 more digits
    // Landline: area code (2-4 digits) + number, separated by space/dash
    regex: /(?<!\d)(?:\+91[\s-]?|0)?[6-9]\d{9}(?!\d)/g,
  },
  {
    category: 'AADHAAR',
    label: 'Aadhaar number',
    // 12 digits possibly split into groups of 4 with space or dash
    regex: /\b\d{4}[\s-]\d{4}[\s-]\d{4}\b|\b\d{12}\b/g,
  },
  {
    category: 'PAN',
    label: 'PAN card number',
    // 5 uppercase letters + 4 digits + 1 uppercase letter
    regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  },
  {
    category: 'EMAIL',
    label: 'Email address',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  },
  {
    category: 'MRN',
    label: 'Medical Record Number',
    // MRN / MR / REG / UHID followed by optional separator and digits
    regex: /\b(?:MRN|MR|REG|UHID|IP|OP)[#:\s\-]?\d{4,12}\b/gi,
  },
  {
    category: 'DOB',
    label: 'Date of Birth',
    // Explicit label followed by a date value
    regex: /\b(?:DOB|D\.O\.B|date\s+of\s+birth|born\s+on)[:\s]+\d{1,2}[\s/\-\.]\w+[\s/\-\.]\d{2,4}/gi,
  },
  {
    category: 'PATIENT_NAME',
    label: 'Patient name',
    // "Name:" or "Patient:" or "Pt:" followed by 2+ capitalised words
    regex: /(?:patient|pt|name)\s*:\s*[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+/gi,
  },
]

// ---------------------------------------------------------------------------
// Core detection function
// ---------------------------------------------------------------------------

/**
 * Detect PII patterns in `text`.
 *
 * @param text          The raw string to scan.
 * @param whitelist     Optional array of pattern categories to skip (admin-configured).
 * @returns             Detection result with matches and summary.
 */
export function detectPii(
  text: string,
  whitelist: PiiCategory[] = []
): PiiDetectionResult {
  if (!text || !text.trim()) {
    return { hasPii: false, matches: [], summary: '' }
  }

  const matches: PiiMatch[] = []
  const activePatterns = PATTERNS.filter((p) => !whitelist.includes(p.category))

  for (const { category, label, regex } of activePatterns) {
    // Reset lastIndex because we reuse regex objects across calls
    regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      matches.push({
        category,
        label,
        match: m[0],
        index: m.index,
      })
    }
  }

  const summary = [...new Set(matches.map((m) => m.category))].join(', ')

  return {
    hasPii: matches.length > 0,
    matches,
    summary,
  }
}

// ---------------------------------------------------------------------------
// Redaction helper (for safe logging — never store raw PII in logs)
// ---------------------------------------------------------------------------

/**
 * Replace detected PII in `text` with "[REDACTED:<category>]" placeholders.
 * Used when writing to server-side logs so PII never appears in log output.
 */
export function redactPii(text: string, whitelist: PiiCategory[] = []): string {
  const result = detectPii(text, whitelist)
  if (!result.hasPii) return text

  let redacted = text
  // Sort by index descending so replacements don't shift positions
  const sorted = [...result.matches].sort((a, b) => b.index - a.index)
  for (const m of sorted) {
    redacted =
      redacted.slice(0, m.index) +
      `[REDACTED:${m.category}]` +
      redacted.slice(m.index + m.match.length)
  }
  return redacted
}

// ---------------------------------------------------------------------------
// Human-readable label builder for UI warnings
// ---------------------------------------------------------------------------

/**
 * Returns a deduplicated, comma-separated string of detected PII labels.
 * e.g. "Phone number, Email address"
 */
export function getPiiWarningLabels(matches: PiiMatch[]): string {
  const seen = new Set<PiiCategory>()
  const labels: string[] = []
  for (const m of matches) {
    if (!seen.has(m.category)) {
      seen.add(m.category)
      labels.push(m.label)
    }
  }
  return labels.join(', ')
}
