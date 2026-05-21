export type CathLabProcedureType = 'CAG' | 'PTCA'
export type CathLabProcedureStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface CathLabProcedure {
  id: string
  procedureType: CathLabProcedureType
  patientUhid: string | null
  cardiologistId: string | null
  cardiologistName: string
  actualStartTime: string | null
  actualEndTime: string | null
  durationMinutes: number | null
  status: CathLabProcedureStatus
  outcome: string
  createdAt: string
  updatedAt: string
}

export interface CreateCathLabProcedureInput {
  procedureType: CathLabProcedureType
  patientUhid: string
  cardiologistId?: string | null
  actualStartTime: string
  actualEndTime: string
  outcome: string
  clinicalNotes?: string | null
}

export interface CardiologistOption {
  id: string
  username: string
}
