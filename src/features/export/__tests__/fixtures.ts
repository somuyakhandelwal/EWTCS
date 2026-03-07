import type {
    PatientCountSummary,
    DelayedPatientsSummary,
    BedPerformanceReport,
    StageDelayReport,
} from '@/features/management-report/types/report.types'

export const RANGE_LABEL = '2026-01-22 to 2026-02-21'

export const patientSummary: PatientCountSummary = {
    totalPatients: 42,
    avgDurationMs: 7_200_000,
    rangeStart: new Date('2026-01-22T00:00:00Z'),
    rangeEnd: new Date('2026-02-21T23:59:59Z'),
    shiftName: 'Morning Shift',
}

export const delaySummary: DelayedPatientsSummary = {
    totalPatients: 100,
    delayedPatients: 30,
    delayPct: 30.0,
    targetPct: 20,
    thresholdMs: 10_800_000,
    rangeStart: new Date('2026-01-22T00:00:00Z'),
    rangeEnd: new Date('2026-02-21T23:59:59Z'),
    trend: [
        { date: '2026-01-22', totalPatients: 10, delayedPatients: 3, delayPct: 30.0 },
        { date: '2026-01-23', totalPatients: 8, delayedPatients: 2, delayPct: 25.0 },
    ],
}

export const bedReport: BedPerformanceReport = {
    rows: [
        {
            bedId: 'bed-1',
            bedNumber: 'ER-01',
            patientsTreated: 15,
            avgDurationMs: 5_400_000,
            minDurationMs: 1_800_000,
            maxDurationMs: 14_400_000,
            delayedCount: 3,
            delayRate: 20,
            isOutlier: false,
        },
        {
            bedId: 'bed-2',
            bedNumber: 'ER-02',
            patientsTreated: 8,
            avgDurationMs: 12_600_000,
            minDurationMs: 7_200_000,
            maxDurationMs: 21_600_000,
            delayedCount: 6,
            delayRate: 75,
            isOutlier: true,
        },
    ],
    overallAvgMs: 9_000_000,
    thresholdMs: 10_800_000,
    rangeStart: new Date('2026-01-22T00:00:00Z'),
    rangeEnd: new Date('2026-02-21T23:59:59Z'),
}

export const stageReport: StageDelayReport = {
    rows: [
        {
            stageId: 'stage-1',
            stageName: 'Triage',
            totalTransitions: 80,
            avgDurationMs: 900_000,
            medianDurationMs: 840_000,
            p90DurationMs: 1_200_000,
            isBottleneck: false,
        },
        {
            stageId: 'stage-2',
            stageName: 'Awaiting Doctor',
            totalTransitions: 76,
            avgDurationMs: 5_400_000,
            medianDurationMs: 4_800_000,
            p90DurationMs: 9_000_000,
            isBottleneck: true,
        },
    ],
    overallMeanMs: 3_150_000,
    rangeStart: new Date('2026-01-22T00:00:00Z'),
    rangeEnd: new Date('2026-02-21T23:59:59Z'),
}
