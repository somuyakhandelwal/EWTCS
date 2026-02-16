// Bed Dashboard Types
// Epic 1: Nurse Desk Bed Dashboard

export type BedStatus = 'empty' | 'occupied' | 'cleaning'

export interface Stage {
  id: string
  name: string
  displayOrder: number
  colorCode: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Bed {
  id: string
  bedNumber: string
  currentStageId: string | null
  currentStage: Stage | null
  patientStartTime: Date | null
  lastStageChange: Date | null
  isOccupied: boolean
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface BedWithElapsedTime extends Bed {
  elapsedTimeMs: number | null
  isDelayed: boolean
}

export interface BedStageLog {
  id: string
  bedId: string
  fromStageId: string | null
  toStageId: string
  changedByUserId: string
  transitionTime: Date
  durationInPreviousStageMs: number | null
  notes: string | null
  metadata: Record<string, unknown>
}

export interface BedGridData {
  beds: BedWithElapsedTime[]
  stages: Stage[]
  delayThresholdMs: number
}
