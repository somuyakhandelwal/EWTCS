export interface WorkflowAreaMetrics {
  occupiedBeds: number
  totalBeds: number
  averageTatMinutes: number
  tatCycleCount: number
  averageCleaningMinutes: number
  cleaningCycleCount: number
}

export interface DepartmentMetrics {
  triage: WorkflowAreaMetrics
  emergency: WorkflowAreaMetrics
  ot: {
    inProgress: number
    completed: number
    utilizationRate: number
  }
  cathLab: {
    activeProcedures: number
    cagCount: number
    ptcaCount: number
  }
}
