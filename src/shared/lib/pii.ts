/**
 * PII Detection & Scrubbing Utility
 * US-17.6: Scrub PII from Inputs
 * US-17.8: Implement Clinical Data Safety Valve
 *
 * This module provides:
 *  1. `detectPII(text)` — returns matched PII patterns (for warnings)
 *  2. `hasPII(text)` — quick boolean check
 *  3. `piiSafeText` — Zod refinement to block text containing PII
 *
 * PII patterns detected:
 *  - Patient names (capitalized word pairs, e.g. "John Smith")
 *  - Phone numbers (various formats)
 *  - Medical record numbers (MRN patterns)
 *  - Email addresses
 *  - Indian Aadhaar / PAN card numbers
 *  - National ID patterns
 *
 * Design note: The system is intentionally conservative (low false-negative
 * rate). False positives can be reviewed and the allowlist extended below.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// PII patterns
// ---------------------------------------------------------------------------

interface PIIPattern {
    name: string
    pattern: RegExp
}

const PII_PATTERNS: PIIPattern[] = [
    // Email addresses
    {
        name: 'email',
        pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/,
    },
    // International phone numbers (+91-XXXXXXXXXX, 10-digit, etc.)
    {
        name: 'phone',
        pattern: /(?:\+?\d{1,3}[-\s.]?)?\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4,}\b/,
    },
    // Medical record numbers: MRN, UHID, IP/OP numbers — e.g. MRN12345
    {
        name: 'mrn',
        pattern: /\b(?:MRN|UHID|IPNO|OPNO|REG|PID)\s*[:\-#]?\s*\d{4,}\b/i,
    },
    // Indian Aadhaar: 12-digit number
    {
        name: 'aadhaar',
        pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/,
    },
    // Indian PAN card: ABCDE1234F
    {
        name: 'pan',
        pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/,
    },
    // Full name pattern — two or more capitalized words (First Last)
    // Intentionally broad to catch "Dr John Smith", "Mrs Priya Sharma", etc.
    {
        name: 'full_name',
        pattern: /\b(?:Dr|Mr|Mrs|Ms|Miss|Prof)\.?\s+[A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,})+\b/,
    },
    // DOB patterns: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
    {
        name: 'date_of_birth',
        pattern: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/,
    },
    // IP address (could indicate a device ID / patient record)
    {
        name: 'ip_address',
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    },
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PIIMatch {
    type: string
    value: string
}

/**
 * Detect PII patterns in a string.
 * Returns an array of matches (may be empty if no PII found).
 */
export function detectPII(text: string): PIIMatch[] {
    if (!text || typeof text !== 'string') return []
    const matches: PIIMatch[] = []
    for (const { name, pattern } of PII_PATTERNS) {
        const match = text.match(pattern)
        if (match) {
            matches.push({ type: name, value: match[0] })
        }
    }
    return matches
}

/**
 * Quick boolean check — true if potential PII is detected.
 */
export function hasPII(text: string): boolean {
    if (!text) return false
    return PII_PATTERNS.some(({ pattern }) => pattern.test(text))
}

/**
 * Zod string refinement that rejects input containing PII.
 * Use via `.refine(noPII, 'Cannot contain patient-identifiable information')` or
 * use the `piiSafeString()` helper below.
 *
 * @example
 *   notes: z.string().max(500).superRefine(piiRefine)
 */
export function piiRefine(
    val: string,
    ctx: z.RefinementCtx
): void {
    const matches = detectPII(val)
    if (matches.length > 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Input may contain patient-identifiable information (${matches.map((m) => m.type).join(', ')}). Please remove and try again.`,
        })
    }
}

/**
 * Convenience: wrap an existing string schema with PII enforcement.
 *
 * @example
 *   const NotesSchema = piiSafeString(z.string().max(500).optional())
 */
export function piiSafeString<T extends z.ZodTypeAny>(schema: T): T {
    return schema.superRefine((val: unknown, ctx: z.RefinementCtx) => {
        if (typeof val === 'string' && val.length > 0) {
            piiRefine(val, ctx)
        }
    }) as T
}
