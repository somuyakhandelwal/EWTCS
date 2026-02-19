/**
 * Helper: Converts milliseconds to rounded minutes string for input display
 * @param {number | null} ms - Duration in milliseconds
 * @returns {string} Duration in minutes or empty string if null
 */
export function formatDurationToMinutes(ms: number | null): string {
    if (!ms && ms !== 0) return ''
    return Math.floor(ms / 60000).toString()
}

/**
 * Helper: Validates the correction form data
 * @param {string} reason - The reason provided for correction
 * @param {string} duration - The new duration string
 * @returns {string | null} Error message or null if valid
 */
export function validateCorrectionForm(reason: string, duration: string): string | null {
    if (!reason || reason.trim().length < 5) {
        return "Please provide a specific, detailed reason for this correction (min 5 chars)."
    }

    if (duration && (isNaN(Number(duration)) || Number(duration) < 0)) {
        return "Duration must be a valid non-negative number."
    }

    return null
}
