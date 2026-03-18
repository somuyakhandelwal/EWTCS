export type CathLabProcedureType = 'CAG' | 'PTCA'

export interface CathLabProcedure {
  id: string
  procedureType: CathLabProcedureType
  patientId: string
  cardiologist: string
  startTime: string
  endTime: string
  outcome: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCathLabProcedureInput {
  procedureType: CathLabProcedureType
  patientId: string
  cardiologist: string
  startTime: string
  endTime: string
  outcome: string
}
