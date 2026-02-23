export interface RawPatientStats {
    totalPatients: string
    totalBedsUsed: string
    totalStageUpdates: string
}

export interface RawAvgStageTime {
    avgStageTimeMs: string | null
}

export interface RawDelayCount {
    delayCount: string
}

export interface RawAvgTat {
    avgTatMs: string | null
}

export interface RawMostDelayedStage {
    stageName: string | null
}

export function getDayBounds(dateStr: string): { dayStart: Date; dayEnd: Date } {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)
    return { dayStart, dayEnd }
}

export function msToMinutes(ms: number): number {
    return Math.round((ms / 60000) * 100) / 100
}
