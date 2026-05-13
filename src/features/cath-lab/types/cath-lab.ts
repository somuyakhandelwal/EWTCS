export type CathLabProcedureType = string

export interface CathLabProcedure {
  id: string
  procedureType: CathLabProcedureType
  patientUhid: string | null
  cardiologistId: string
  startTime: string | null
  endTime: string | null
  outcome: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCathLabProcedureInput {
  procedureType: CathLabProcedureType
  patientUhid?: string | null
  cardiologistId?: string
  startTime?: string | null
  endTime?: string | null
  outcome?: string | null
}
