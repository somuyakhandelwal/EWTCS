export interface CorrectedFieldDiff {
    from: unknown
    to: unknown
}

export interface HistoryCorrection {
    id: string
    bedStageLogId: string
    correctedByUserId: string
    correctedByUsername: string
    correctionReason: string
    correctedFields: Record<string, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        from: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to: any
    }>
    correctedAt: Date
}

export interface InsertCorrectionParams {
    bedStageLogId: string
    correctedByUserId: string
    correctionReason: string
    correctedFields: Record<string, CorrectedFieldDiff>
}

export interface CorrectionAuditFilters {
    startDate?: Date
    endDate?: Date
    correctedByUserId?: string
    bedNumber?: string
    reason?: string
}

export interface CorrectionAuditRecord extends HistoryCorrection {
    bedNumber: string
    originalNotes: string | null
    originalTransitionTime: Date
    originalToStageId: string
    originalToStageName: string
    correctedToStageName: string | null
}
