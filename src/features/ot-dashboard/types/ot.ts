// OT Dashboard Types
// EPIC 23: Operation Theatre (OT) Tracking Module (US-23.1)

export type OTRoomStatus = 'available' | 'ongoing'

export interface OTRoom {
  id: string
  roomNumber: string
  status: OTRoomStatus
  startedAt: Date | null
  activeProcedureName: string | null
  updatedAt: Date
}

export interface OTGridData {
  rooms: OTRoom[]
  availableCount: number
  ongoingCount: number
}
