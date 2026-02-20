// Type definitions for bed management feature

export interface BedManagementData {
    id: string
    bedNumber: string
    wardId: string
    wardName: string
    currentStageId: string | null
    currentStageName: string | null
    isOccupied: boolean
    isActive: boolean
    isTemporary: boolean   // US-6.5: true for surge beds created by supervisor
    isVirtual: boolean     // US-6.6: true for nurse-created hallway/stretcher patients
    location?: string
    metadata?: Record<string, unknown>
    patientStartTime: Date | null
    createdAt: Date
    updatedAt: Date
}

export interface CreateBedInput {
    bedNumber: string
    wardId: string
    location?: string
}

export interface UpdateBedInput {
    bedNumber?: string
    wardId?: string
    location?: string
}

export interface BedManagementFilter {
    showInactive?: boolean
    wardId?: string
    searchTerm?: string
}
